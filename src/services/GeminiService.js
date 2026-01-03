import { GEMINI_API_KEY, GEMINI_API_URL } from '../config/gemini';

export const GeminiService = {
  transcribeAndExtractTasks: async (audioUrl) => {
    try {
      console.log('🤖 Starting Gemini 2.5 transcription...');
      console.log('📎 Audio URL:', audioUrl);

      console.log('📥 Downloading audio...');
      const audioResponse = await fetch(audioUrl);
      
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }
      
      const audioBlob = await audioResponse.blob();
      console.log('📦 Audio size:', audioBlob.size, 'bytes');

      // Check file size (Gemini limit 20MB)
      if (audioBlob.size > 20 * 1024 * 1024) {
        throw new Error('Audio file too large (max 20MB)');
      }

      console.log('🔄 Converting to base64...');
      const base64Audio = await blobToBase64(audioBlob);
      
      const prompt = `You are an expert AI meeting assistant specialized in accurate transcription and intelligent task extraction.

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

# TRANSCRIPTION RULES

1. **Accuracy First**: Transcribe EVERY word spoken, including filler words (um, uh, like)
2. **Speaker Attribution**: If multiple speakers, use "Speaker 1:", "Speaker 2:" format
3. **Timestamps**: Do NOT include timestamps
4. **Corrections**: If you hear a self-correction, include both versions: "next Tuesday, sorry, next Wednesday"
5. **Acronyms**: Spell out first use, then acronym: "Application Programming Interface (API)"
6. **Numbers**: Use digits for numbers (5, 100, 2024)
7. **Special Characters**: Escape ALL special characters properly:
   - Newlines: Use \\n (double backslash n)
   - Quotes: Use \\" (backslash double-quote)
   - Tabs: Use \\t
   - Backslashes: Use \\\\
8. **NO actual line breaks**: The transcript MUST be a single-line string with \\n for line breaks

# SUMMARY RULES

1. **Length**: Exactly 2-3 paragraphs (100-200 words total)
2. **Content**: Cover:
   - Main meeting purpose
   - Key decisions made
   - Important discussion points
   - Overall outcome/next steps
3. **Style**: Professional, third-person, past tense
4. **NO bullet points**: Write in flowing paragraph form
5. **Escape special characters** the same way as transcript

# TASK EXTRACTION RULES

## What Qualifies as a Task:
✅ Action verbs: "complete", "review", "send", "prepare", "follow up", "schedule"
✅ Clear deliverables: "the report", "presentation", "budget", "meeting notes"
✅ Assignments: "John will...", "Sarah needs to...", "team should..."
✅ Deadlines mentioned: "by Friday", "next week", "before the 15th"

## What is NOT a Task:
❌ General statements: "we should think about..."
❌ Past actions: "we already did..."
❌ Questions without assignment: "should we consider...?"
❌ Vague discussions: "maybe someone could..."

## Task Field Requirements:

### description:
- Start with action verb (Complete, Review, Send, Prepare, Schedule, Follow up, etc.)
- Be specific and concrete: "Complete the Q4 budget analysis report" NOT "work on budget"
- Include context if mentioned: "Review the updated contract with legal team"
- Keep under 100 characters
- NO vague phrases like "look into" or "think about"

### assignee:
- Use EXACT name mentioned in audio
- If role mentioned: "Sales Team", "Marketing Lead", "Project Manager"
- If multiple people: Use "John and Sarah" or "Engineering Team"
- If "everyone" or "all": Use "Everyone"
- If unclear or not mentioned: Use "Unassigned"
- NEVER use pronouns (he, she, they) - find the actual name
- If name is unclear, use "Unassigned" rather than guessing

### deadline:
- Use EXACT phrasing from audio: "Friday", "end of week", "by December 31st"
- For relative dates: "next Monday", "by end of month", "in two weeks"
- For urgent: "today", "ASAP", "by end of day"
- If multiple deadlines mentioned, use the FINAL one
- If no deadline mentioned: Use "No deadline"
- NEVER invent deadlines

### priority:
- **High**: Contains words like "urgent", "critical", "ASAP", "immediately", "top priority"
- **High**: Has deadline within 3 days
- **High**: Mentioned multiple times or emphasized
- **Medium**: Standard deadline (within 1-2 weeks)
- **Medium**: No urgency words but clear importance
- **Low**: Long-term deadline (more than 2 weeks)
- **Low**: Optional or "when you have time" tasks
- **Low**: "Nice to have" items
- Default to "Medium" if unclear

# EDGE CASES

## No Tasks Found:
- If meeting is purely informational with NO action items, return empty tasks array: "tasks": []
- Do NOT invent tasks

## Poor Audio Quality:
- For inaudible sections, use: "[inaudible]"
- Continue transcribing what you CAN hear
- If entire audio is inaudible: transcript: "[Audio quality too poor for transcription]", tasks: []

## Multiple Languages:
- Transcribe primary language heard
- For mixed languages: use the language spoken per segment
- Summary should be in English

## Very Short Recording (<30 seconds):
- Still provide complete transcript
- Summary can be 1 paragraph
- tasks array will likely be empty

# CRITICAL JSON FORMATTING RULES

1. **NO CODE BLOCKS**: Do not wrap output in \`\`\`json or \`\`\`
2. **NO MARKDOWN**: No **bold**, *italic*, or other formatting
3. **SINGLE LINE STRINGS**: All text fields must be single-line strings
4. **ESCAPE EVERYTHING**: All quotes, newlines, tabs, backslashes MUST be escaped
5. **VALID JSON**: Your output must pass JSON.parse() without errors
6. **NO TRAILING COMMAS**: Last item in arrays/objects must have no comma
7. **DOUBLE QUOTES ONLY**: Use " not ' for all strings
8. **NO COMMENTS**: JSON does not support comments

# EXAMPLE OUTPUT

Here is a PERFECT example of the expected output format:

{
  "transcript": "Speaker 1: Good morning everyone. Let's start our Q4 planning meeting. Sarah, can you give us an update on the marketing campaign?\\n\\nSpeaker 2: Sure. The campaign launch is scheduled for next Friday. We need John to finalize the budget by Wednesday so we can proceed with ad placements.\\n\\nSpeaker 1: Got it. John, is that doable?\\n\\nSpeaker 3: Yes, I'll have the budget ready by end of day Wednesday.\\n\\nSpeaker 1: Perfect. Also, the client presentation needs to be ready by Monday. Sarah, can you and Mark work together on that?\\n\\nSpeaker 2: Yes, we'll have a draft by Friday for your review.",
  "summary": "The Q4 planning meeting focused on coordinating the upcoming marketing campaign launch scheduled for next Friday. The team discussed critical dependencies, with John committing to finalize the budget by Wednesday to enable timely ad placements. Additionally, Sarah and Mark were assigned to prepare the client presentation with a draft due Friday for review before the Monday deadline. All team members confirmed their ability to meet the established timelines.",
  "tasks": [
    {
      "description": "Finalize Q4 marketing campaign budget",
      "assignee": "John",
      "deadline": "Wednesday end of day",
      "priority": "High"
    },
    {
      "description": "Prepare client presentation draft",
      "assignee": "Sarah and Mark",
      "deadline": "Friday",
      "priority": "Medium"
    },
    {
      "description": "Review client presentation draft",
      "assignee": "Speaker 1",
      "deadline": "Monday",
      "priority": "Medium"
    }
  ]
}

# FINAL CHECKLIST BEFORE RESPONDING

Before you output your JSON, verify:
□ Output is PURE JSON (no markdown, no code blocks, no preamble)
□ All strings are properly escaped (no actual newlines in strings)
□ Every task has all 4 required fields
□ Every task has an action verb in description
□ No invented information (only what's in the audio)
□ Priority levels make sense (High/Medium/Low)
□ Valid JSON structure (no trailing commas, matching brackets)
□ Summary is 2-3 paragraphs in flowing prose

NOW: Process the audio and respond with ONLY the JSON object following ALL rules above.`;

      console.log('🚀 Calling Gemini 2.5 API...');
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: 'audio/m4a',
                    data: base64Audio
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,  
            maxOutputTokens: 8192,
            topP: 0.8,        
            topK: 10        
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Gemini 2.5 response received');

      // Parse response with enhanced error handling
      const result = parseGeminiResponse(data);
      console.log('📝 Parsed result:');
      console.log('  - Transcript length:', result.transcript.length);
      console.log('  - Tasks extracted:', result.tasks.length);

      return result;
    } catch (error) {
      console.error('❌ Gemini service error:', error);
      throw error;
    }
  }
};

// Convert Blob to Base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const parseGeminiResponse = (data) => {
  try {
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Invalid Gemini response structure');
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('📄 Raw response preview:', text.substring(0, 300) + '...');

    let cleanText = text.trim();
    
    cleanText = cleanText.replace(/```json\s*/g, '');
    cleanText = cleanText.replace(/```\s*/g, '');
    cleanText = cleanText.replace(/^json\s*/g, '');
    
    cleanText = cleanText.trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn('⚠️ No JSON object found in response');
      return createFallbackResult(text);
    }

    let jsonString = jsonMatch[0];

    try {
      const parsed = JSON.parse(jsonString);
      return validateAndNormalizeResult(parsed);
    } catch (firstError) {
      console.warn('⚠️ First parse attempt failed, attempting cleanup...');
      
      try {
        let fixedJson = jsonString;
        
        fixedJson = fixedJson.replace(
          /"transcript"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g,
          (match, content) => {
            const cleaned = content
              .replace(/\r\n/g, '\\n')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\n')
              .replace(/\t/g, '\\t')
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"');
            return `"transcript": "${cleaned}"`;
          }
        );
        
        // Fix summary field
        fixedJson = fixedJson.replace(
          /"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g,
          (match, content) => {
            const cleaned = content
              .replace(/\r\n/g, '\\n')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\n')
              .replace(/\t/g, '\\t')
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"');
            return `"summary": "${cleaned}"`;
          }
        );
        
        // Fix description fields in tasks
        fixedJson = fixedJson.replace(
          /"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g,
          (match, content) => {
            const cleaned = content
              .replace(/\r\n/g, ' ')
              .replace(/\n/g, ' ')
              .replace(/\r/g, ' ')
              .replace(/\t/g, ' ')
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\s+/g, ' ')
              .trim();
            return `"description": "${cleaned}"`;
          }
        );

        const parsed = JSON.parse(fixedJson);
        console.log('✅ JSON parsed after cleanup');
        return validateAndNormalizeResult(parsed);
        
      } catch (secondError) {
        console.error('⚠️ Second parse attempt failed');
        
        try {
          return manualExtraction(jsonString, text);
        } catch (manualError) {
          console.error('❌ All parsing attempts failed');
          return createFallbackResult(text);
        }
      }
    }

  } catch (error) {
    console.error('❌ Parse error:', error);
    return createFallbackResult('Error: Could not parse transcription');
  }
};

// Validate and normalize the parsed result
const validateAndNormalizeResult = (parsed) => {
  const result = {
    transcript: '',
    summary: '',
    tasks: []
  };

  // Validate and normalize transcript
  if (parsed.transcript && typeof parsed.transcript === 'string') {
    result.transcript = parsed.transcript.trim();
  } else if (parsed.transcription && typeof parsed.transcription === 'string') {
    result.transcript = parsed.transcription.trim();
  } else {
    result.transcript = 'No transcript available';
  }

  // Validate and normalize summary
  if (parsed.summary && typeof parsed.summary === 'string') {
    result.summary = parsed.summary.trim();
  } else {
    result.summary = 'No summary generated';
  }

  // Validate and normalize tasks
  if (Array.isArray(parsed.tasks)) {
    result.tasks = parsed.tasks
      .filter(task => task && typeof task === 'object')
      .map(task => ({
        description: String(task.description || task.task || 'No description').trim(),
        assignee: String(task.assignee || task.assigned_to || 'Unassigned').trim(),
        deadline: String(task.deadline || task.due_date || 'No deadline').trim(),
        priority: validatePriority(task.priority)
      }))
      .filter(task => task.description !== 'No description' && task.description.length > 0);
  }

  return result;
};

// Validate priority field
const validatePriority = (priority) => {
  if (!priority) return 'Medium';
  
  const priorityStr = String(priority).toLowerCase().trim();
  
  if (priorityStr.includes('high') || priorityStr.includes('urgent') || priorityStr.includes('critical')) {
    return 'High';
  } else if (priorityStr.includes('low')) {
    return 'Low';
  } else {
    return 'Medium';
  }
};

// Manual extraction as last resort (improved)
const manualExtraction = (jsonString, fullText) => {
  console.log('🔧 Attempting manual extraction...');
  
  const result = {
    transcript: '',
    summary: '',
    tasks: []
  };

  // Extract transcript
  const transcriptMatch = jsonString.match(/"transcript"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (transcriptMatch) {
    result.transcript = transcriptMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  // Extract summary
  const summaryMatch = jsonString.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (summaryMatch) {
    result.summary = summaryMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  // Extract tasks array
  const tasksMatch = jsonString.match(/"tasks"\s*:\s*\[([\s\S]*?)\]/);
  if (tasksMatch) {
    const tasksString = tasksMatch[1];
    
    // Split by task objects
    const taskMatches = tasksString.match(/\{[^}]+\}/g);
    
    if (taskMatches) {
      taskMatches.forEach(taskStr => {
        const task = {};
        
        const descMatch = taskStr.match(/"description"\s*:\s*"([^"]*)"/);
        if (descMatch) task.description = descMatch[1];
        
        const assigneeMatch = taskStr.match(/"assignee"\s*:\s*"([^"]*)"/);
        if (assigneeMatch) task.assignee = assigneeMatch[1];
        
        const deadlineMatch = taskStr.match(/"deadline"\s*:\s*"([^"]*)"/);
        if (deadlineMatch) task.deadline = deadlineMatch[1];
        
        const priorityMatch = taskStr.match(/"priority"\s*:\s*"([^"]*)"/);
        if (priorityMatch) task.priority = priorityMatch[1];
        
        if (task.description) {
          result.tasks.push({
            description: task.description,
            assignee: task.assignee || 'Unassigned',
            deadline: task.deadline || 'No deadline',
            priority: validatePriority(task.priority) || 'Medium'
          });
        }
      });
    }
  }

  // If we got something useful, return it
  if (result.transcript || result.summary || result.tasks.length > 0) {
    console.log('✅ Manual extraction successful');
    return result;
  }

  // Final fallback
  return createFallbackResult(fullText);
};

// Create fallback result when parsing completely fails
const createFallbackResult = (text) => {
  console.warn('⚠️ Using fallback result structure');
  
  return {
    transcript: text.substring(0, 5000),
    summary: text.substring(0, 500),
    tasks: []
  };
};