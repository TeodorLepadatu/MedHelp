import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TriageService } from '../../services/triage.service';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: string; 
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  
  // We keep this to track the CURRENT session in the DB, 
  // but we don't show the list anymore.
  currentConversationId: string | null = null;
  
  isTyping: boolean = false;
  isDropdownOpen: boolean = false;
  isDiagnosisComplete: boolean = false;

  constructor(
    private triageService: TriageService,
    private router: Router
  ) {}

  ngOnInit() {
    // We no longer load the history list here.
    // The chat starts fresh every time you refresh the page.
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  toggleDropdown() { this.isDropdownOpen = !this.isDropdownOpen; }
  
  goToProfile() { 
    this.router.navigate(['/profile']); 
  }
  
  logout() { 
    localStorage.clear(); 
    this.router.navigate(['/login']); 
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.isDiagnosisComplete) return;

    const textToSend = this.newMessage;
    this.newMessage = ''; 

    // Optimistically add to UI
    this.messages.push({
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    });

    this.isTyping = true;

    // Send to backend
    this.triageService.sendMessage(textToSend, this.currentConversationId).subscribe({
      next: (response) => {
        this.isTyping = false;
        
        // If this was the first message, the server created a new ID.
        // We save it so subsequent messages belong to the same session.
        if (!this.currentConversationId && response.conversation_id) {
          this.currentConversationId = response.conversation_id;
        }

        this.handleAiResponse(response);
      },
      error: (err) => {
        this.isTyping = false;
        console.error(err);
        this.messages.push({
          sender: 'bot',
          text: "Connection error. Please try again.",
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private handleAiResponse(response: any) {
    if (response.error) {
      this.messages.push({
        sender: 'bot',
        text: `System Error: ${response.error}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const aiData = JSON.parse(response.gpt_json);
      const nextQuestion = aiData.next_question;

      // 1. FORMAT THE RAG EVIDENCE SECTION (Used in both Questions and Final Report)
      let evidenceSection = "";
      if (aiData.evidence_used && aiData._retrieved && aiData._retrieved.length > 0) {
        evidenceSection += "\n\n📚 **MEDICAL SOURCES USED:**\n";
        aiData._retrieved.forEach((doc: any, index: number) => {
           // We create a simple text representation. 
           // If you want clickable links, we'd need to change the HTML to support <a href>,
           // but for now, we will display the URL text.
           evidenceSection += `[${index + 1}] ${doc.source_title}\n   🔗 ${doc.url}\n`;
        });
      }

      if (nextQuestion === 'DIAGNOSIS_COMPLETE') {
        this.isDiagnosisComplete = true;
        
        let finalReport = "📋 **FINAL MEDICAL ANALYSIS**\n\n";
        
        if (aiData.candidates) {
          finalReport += "Top Suspected Conditions:\n";
          const sorted = aiData.candidates.sort((a: any, b: any) => b.probability - a.probability);
          sorted.forEach((c: any) => {
            const pct = Math.round(c.probability * 100);
            finalReport += `• ${c.condition} (${pct}%)\n`;
          });
        }
        
        finalReport += `\n💡 **ADVICE:**\n${aiData.top_recommendation}`;
        
        // Append Evidence to Final Report
        finalReport += evidenceSection;

        this.messages.push({
          sender: 'bot',
          text: finalReport,
          timestamp: new Date().toISOString()
        });

      } else {
        // It's a normal question, but we can still show evidence if the AI used it to ask the question
        let questionText = nextQuestion;
        if (evidenceSection) {
            // Optional: You can uncomment this if you want to see sources during the questions too
            // questionText += evidenceSection; 
        }

        this.messages.push({
          sender: 'bot',
          text: questionText,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Error parsing JSON", e);
      this.messages.push({
        sender: 'bot',
        text: "Error processing the medical analysis.",
        timestamp: new Date().toISOString()
      });
    }
  }
}