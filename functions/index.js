/**
 * Firebase Cloud Functions for SmartMeeting
 * 服务端邮件发送和转录服务
 */

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 配置环境变量
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

/**
 * Cloud Function: 发送任务分配邮件
 * 触发条件：当 meeting 文档更新且状态变为 completed 时
 */
exports.sendTaskEmail = functions.firestore
  .document('meetings/{meetingId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // 只在状态变为 completed 且未发送邮件时触发
    if (
      newData.status === 'completed' &&
      (!oldData.emailSent || oldData.emailSent === false) &&
      newData.tasks &&
      newData.tasks.length > 0
    ) {
      console.log(`📧 Triggering email send for meeting: ${context.params.meetingId}`);

      try {
        // 获取团队成员
        const userId = newData.userId;
        const userDoc = await change.after.ref.firestore
          .collection('users')
          .doc(userId)
          .get();

        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const teamMembers = userData?.teamMembers || [];

        let emailsSent = 0;
        let emailsFailed = 0;
        const errors = [];

        // 遍历所有任务
        for (const task of newData.tasks) {
          // 跳过未分配的任务
          if (!task.assignee || task.assignee === 'Unassigned') {
            continue;
          }

          // 检查是否分配给所有人
          const isEveryoneTask = isEveryoneAssignment(task.assignee);

          if (isEveryoneTask) {
            // 发送给所有团队成员
            for (const member of teamMembers) {
              try {
                await sendEmail({
                  to: member.email,
                  task: { ...task, assignee: member.name },
                  meetingTitle: newData.title,
                  meetingId: context.params.meetingId,
                });
                emailsSent++;
              } catch (error) {
                console.error(`❌ Failed to send to ${member.email}`, error);
                emailsFailed++;
                errors.push({
                  task: task.description,
                  assignee: member.name,
                  reason: error.message,
                });
              }
            }
          } else {
            // 查找成员邮箱
            const member = findMemberByEmail(task.assignee, teamMembers);

            if (!member) {
              console.warn(`⚠️ No email found for: ${task.assignee}`);
              emailsFailed++;
              errors.push({
                task: task.description,
                assignee: task.assignee,
                reason: 'Email not found',
              });
              continue;
            }

            try {
              await sendEmail({
                to: member.email,
                task,
                meetingTitle: newData.title,
                meetingId: context.params.meetingId,
              });
              emailsSent++;
            } catch (error) {
              console.error(`❌ Failed to send to ${member.email}`, error);
              emailsFailed++;
              errors.push({
                task: task.description,
                assignee: task.assignee,
                reason: error.message,
              });
            }
          }
        }

        // 更新会议文档的邮件发送状态
        await change.after.ref.update({
          emailSent: emailsFailed === 0,
          emailsSentCount: emailsSent,
          emailsFailedCount: emailsFailed,
          emailSentAt: new Date().toISOString(),
          lastEmailResult: {
            success: emailsFailed === 0,
            sent: emailsSent,
            failed: emailsFailed,
            errors,
          },
        });

        console.log(`✅ Email sending completed: ${emailsSent} sent, ${emailsFailed} failed`);
      } catch (error) {
        console.error('❌ Error in sendTaskEmail function:', error);

        // 记录错误
        await change.after.ref.update({
          emailSendError: error.message,
          emailSendErrorAt: new Date().toISOString(),
        });
      }
    }
  });

/**
 * Cloud Function: 服务端转录服务（保护 API Key）
 */
exports.transcribeAudio = functions.https.onCall(async (data, context) => {
  // 验证用户登录
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { audioUrl } = data;

  if (!audioUrl) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'audioUrl is required'
    );
  }

  try {
    console.log(`🤖 Starting transcription for user: ${context.auth.uid}`);

    // 下载音频文件
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBlob = await audioResponse.blob();
    const base64Audio = await blobToBase64(audioBlob);

    // 调用 Gemini API
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = buildTranscriptionPrompt();

    const result = await model.generateContent({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mime_type: 'audio/m4a',
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        topP: 0.8,
        topK: 10,
      },
    });

    const response = await result.response;
    const text = response.text();

    // 解析响应
    const transcriptionResult = parseGeminiResponse(text);

    console.log('✅ Transcription completed');

    return {
      success: true,
      data: transcriptionResult,
    };
  } catch (error) {
    console.error('❌ Transcription error:', error);

    throw new functions.https.HttpsError(
      'internal',
      'Transcription failed',
      error.message
    );
  }
});

/**
 * 辅助函数：发送邮件
 */
async function sendEmail({ to, task, meetingTitle, meetingId }) {
  const priorityColor = {
    High: '#F44336',
    Medium: '#FF9800',
    Low: '#4CAF50',
  };

  const color = priorityColor[task.priority] || '#2196F3';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 24px;">📋 New Task Assignment</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Hi <strong>${task.assignee}</strong>,</p>
                  <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 30px;">
                    You have been assigned a new task from the meeting: <strong>${meetingTitle}</strong>
                  </p>

                  <!-- Task Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid ${color};">
                    <tr>
                      <td style="padding: 20px;">
                        <table width="100%" cellpadding="8" cellspacing="0">
                          <tr>
                            <td style="font-weight: bold; color: #555; font-size: 14px; width: 120px;">📝 Task:</td>
                            <td style="color: #333; font-size: 14px;">${task.description}</td>
                          </tr>
                          <tr>
                            <td style="font-weight: bold; color: #555; font-size: 14px;">⏰ Deadline:</td>
                            <td style="color: #333; font-size: 14px;">${task.deadline || 'No deadline specified'}</td>
                          </tr>
                          <tr>
                            <td style="font-weight: bold; color: #555; font-size: 14px;">🎯 Priority:</td>
                            <td>
                              <span style="display: inline-block; padding: 4px 12px; background-color: ${color}; color: white; border-radius: 12px; font-size: 12px; font-weight: bold;">
                                ${task.priority || 'Medium'}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
                    Open the Meeting Assistant app to view full meeting details.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #999;">
                    This email was sent by Meeting Assistant<br>
                    © 2025 All rights reserved
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
New Task Assignment

Hi ${task.assignee},

You have been assigned a new task from the meeting: ${meetingTitle}

Task Details:
- Description: ${task.description}
- Deadline: ${task.deadline || 'No deadline specified'}
- Priority: ${task.priority || 'Medium'}

Open the Meeting Assistant app to view full meeting details.

---
This email was sent by Meeting Assistant
  `.trim();

  await transporter.sendMail({
    from: `"Meeting Assistant" <${SMTP_USER}>`,
    to,
    subject: `📋 New Task Assigned: ${task.description}`,
    text,
    html,
  });

  console.log(`✅ Email sent to ${to}`);
}

/**
 * 辅助函数：检查是否分配给所有人
 */
function isEveryoneAssignment(assignee) {
  if (!assignee) return false;

  const keywords = [
    'everyone',
    'everybody',
    'all',
    'all members',
    'all team members',
    'team',
    'whole team',
    'entire team',
    '所有人',
    '全员',
    '全体',
  ];

  return keywords.includes(assignee.trim().toLowerCase());
}

/**
 * 辅助函数：查找团队成员
 */
function findMemberByEmail(name, teamMembers) {
  if (!name || !teamMembers || teamMembers.length === 0) {
    return null;
  }

  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '');

  // 精确匹配
  let member = teamMembers.find(
    (m) => m.name.trim().toLowerCase().replace(/\s+/g, '') === normalizedName
  );

  // 模糊匹配
  if (!member) {
    member = teamMembers.find(
      (m) =>
        m.name.trim().toLowerCase().includes(name.trim().toLowerCase()) ||
        name.trim().toLowerCase().includes(m.name.trim().toLowerCase())
    );
  }

  return member || null;
}

/**
 * 辅助函数：Blob 转 Base64
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 辅助函数：构建转录提示词
 */
function buildTranscriptionPrompt() {
  // 这里可以提取到单独的文件，与客户端共享
  return `You are an expert AI meeting assistant specialized in accurate transcription and intelligent task extraction.

# YOUR MISSION
Analyze this audio recording and extract three critical components with PERFECT accuracy:
1. Complete word-for-word transcription
2. Concise executive summary
3. Actionable tasks with clear assignments

# OUTPUT FORMAT REQUIREMENTS
CRITICAL: You MUST respond with ONLY a valid JSON object. NO markdown, NO code blocks, NO explanations.

Your response must be a single JSON object with this EXACT structure:
{
  "transcript": "full transcription here",
  "summary": "2-3 paragraph summary here",
  "tasks": [
    {
      "description": "specific action item",
      "assignee": "person name or Unassigned",
      "deadline": "specific date or No deadline",
      "priority": "High or Medium or Low"
    }
  ]
}

[Additional rules similar to client-side implementation...]

NOW: Process the audio and respond with ONLY the JSON object.`;
}

/**
 * 辅助函数：解析 Gemini 响应
 */
function parseGeminiResponse(text) {
  try {
    // 清理 Markdown 格式
    let cleanText = text.trim()
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // 提取 JSON
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      transcript: parsed.transcript || 'No transcript available',
      summary: parsed.summary || 'No summary generated',
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch (error) {
    console.error('❌ Parse error:', error);
    throw new Error('Failed to parse transcription result');
  }
}
