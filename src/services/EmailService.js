import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export const EmailService = {
  /**
   * assign tasks to team members and send emails
   * @param {Array} tasks 
   * @param {string} meetingId 
   * @param {string} meetingTitle
   */
  sendTaskAssignmentEmails: async (tasks, meetingId, meetingTitle) => {
    try {
      console.log('📧 Starting to send task assignment emails...');
      
      if (!tasks || tasks.length === 0) {
        console.log('⚠️ No tasks to send');
        return { success: true, sent: 0, message: 'No tasks to assign' };
      }

      const teamMembers = await EmailService.getTeamMembers();
      console.log('👥 Team members loaded:', teamMembers);

      let emailsSent = 0;
      let emailsFailed = 0;
      const errors = [];

      // send emails to each task with assigned members
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        // Check if task is assigned to everyone
        const isEveryoneTask = EmailService.isEveryoneAssignment(task.assignee);
        
        if (isEveryoneTask) {
          // Send to all team members
          console.log(`📢 Task assigned to everyone: ${task.description}`);
          
          if (teamMembers.length === 0) {
            console.warn('⚠️ No team members found to send to');
            emailsFailed++;
            errors.push({
              task: task.description,
              assignee: task.assignee,
              reason: 'No team members configured'
            });
            continue;
          }

          // Send email to each team member
          for (const member of teamMembers) {
            try {
              await EmailService.sendEmail({
                to: member.email,
                task: { ...task, assignee: member.name }, // Personalize assignee name
                meetingTitle: meetingTitle,
                meetingId: meetingId,
                taskIndex: i
              });

              emailsSent++;
              console.log(`✅ Email sent to ${member.email} (${member.name})`);
              
            } catch (error) {
              console.error(`❌ Failed to send email to ${member.email}`, error);
              emailsFailed++;
              errors.push({
                task: task.description,
                assignee: member.name,
                reason: error.message
              });
            }
          }
          
          continue; // Move to next task
        }

        // skip unassigned tasks
        if (!task.assignee || 
            task.assignee === 'Unassigned' || 
            task.assignee === '未分配' ||
            task.assignee === 'N/A') {
          console.log(`⏭️ Skipping unassigned task: ${task.description}`);
          continue;
        }

        try {
          // find member email
          const memberEmail = EmailService.findMemberEmail(task.assignee, teamMembers);
          
          if (!memberEmail) {
            console.warn(`⚠️ No email found for: ${task.assignee}`);
            emailsFailed++;
            errors.push({
              task: task.description,
              assignee: task.assignee,
              reason: 'Email not found in team members'
            });
            continue;
          }

          // send email
          await EmailService.sendEmail({
            to: memberEmail,
            task: task,
            meetingTitle: meetingTitle,
            meetingId: meetingId,
            taskIndex: i
          });

          emailsSent++;
          console.log(`✅ Email sent to ${memberEmail} for task: ${task.description}`);
          
        } catch (error) {
          console.error(`❌ Failed to send email for task: ${task.description}`, error);
          emailsFailed++;
          errors.push({
            task: task.description,
            assignee: task.assignee,
            reason: error.message
          });
        }
      }

      const result = {
        success: emailsFailed === 0,
        sent: emailsSent,
        failed: emailsFailed,
        total: tasks.length,
        errors: errors
      };

      console.log('📊 Email sending summary:', result);
      return result;

    } catch (error) {
      console.error('❌ Error in sendTaskAssignmentEmails:', error);
      throw error;
    }
  },

  /**
   * Check if assignee represents "everyone" or all team members
   * @param {string} assignee 
   * @returns {boolean}
   */
  isEveryoneAssignment: (assignee) => {
    if (!assignee) return false;
    
    const normalizedAssignee = assignee.trim().toLowerCase();
    
    // List of keywords that indicate "everyone"
    const everyoneKeywords = [
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
      '所有成员',
      '团队所有人'
    ];

    return everyoneKeywords.includes(normalizedAssignee);
  },


  sendEmail: async ({ to, task, meetingTitle, meetingId, taskIndex }) => {
    try {
      const mailCollection = collection(db, 'mail');
      
      // generate email content
      const emailContent = EmailService.generateEmailContent({
        task,
        meetingTitle,
        meetingId,
        taskIndex
      });

      const emailDoc = {
        to: to,
        message: {
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text, 
        },
        metadata: {
          meetingId: meetingId,
          taskDescription: task.description,
          assignee: task.assignee,
          sentAt: new Date().toISOString(),
          sentBy: auth.currentUser?.email || 'system'
        }
      };

      const docRef = await addDoc(mailCollection, emailDoc);
      console.log(`📬 Email queued with ID: ${docRef.id}`);
      
      return docRef.id;

    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  },

  generateEmailContent: ({ task, meetingTitle, meetingId, taskIndex }) => {
    const appName = 'Meeting Assistant';
    const priorityColor = {
      'High': '#F44336',
      'Medium': '#FF9800',
      'Low': '#4CAF50',
      '高': '#F44336',
      '中': '#FF9800',
      '低': '#4CAF50',
    };

    const color = priorityColor[task.priority] || '#2196F3';

    const subject = `📋 New Task Assigned: ${task.description}`;

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

                    <!-- Action Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                      <tr>
                        <td align="center">
                          <a href="meetingassistant://meeting/${meetingId}" 
                             style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                            View Full Meeting Details
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
                      If the button doesn't work, you can view the meeting details in the ${appName} app.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f5f5f5; padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #999;">
                      This email was sent by ${appName}<br>
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

Open the ${appName} app to view full meeting details.

---
This email was sent by ${appName}
    `.trim();

    return { subject, html, text };
  },

  getTeamMembers: async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.warn('⚠️ No authenticated user');
        return [];
      }

      // get team members configuration from user profile
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        console.warn('⚠️ User profile not found');
        return [];
      }

      const userData = userDoc.data();
      const teamMembers = userData.teamMembers || [];

      console.log(`✅ Loaded ${teamMembers.length} team members`);
      return teamMembers;

    } catch (error) {
      console.error('❌ Error getting team members:', error);
      return [];
    }
  },

  findMemberEmail: (assigneeName, teamMembers) => {
    if (!assigneeName || !teamMembers || teamMembers.length === 0) {
      return null;
    }

    // normalize name (remove space, lowercase)
    const normalizedAssignee = assigneeName.trim().toLowerCase().replace(/\s+/g, '');

    // exact match
    let member = teamMembers.find(m => 
      m.name.trim().toLowerCase().replace(/\s+/g, '') === normalizedAssignee
    );

    // if no exact match, try partial match
    if (!member) {
      member = teamMembers.find(m => 
        m.name.trim().toLowerCase().includes(assigneeName.trim().toLowerCase()) ||
        assigneeName.trim().toLowerCase().includes(m.name.trim().toLowerCase())
      );
    }

    return member ? member.email : null;
  },

  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};