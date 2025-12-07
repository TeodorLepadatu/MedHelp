import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TriageService } from '../../services/triage.service';
import { AuthService } from '../../services/auth.service'; // Import AuthService

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
  currentConversationId: string | null = null;
  
  // To store the User ID
  currentUserId: string | null = null;
  
  isTyping: boolean = false;
  isDropdownOpen: boolean = false;
  isDiagnosisComplete: boolean = false;

  constructor(
    private triageService: TriageService,
    private authService: AuthService, // Inject Auth Service
    private router: Router
  ) {}

  ngOnInit() {
    // 1. Get User ID from AuthService (decoding token)
    // Note: We need to make sure authService has a method to get the ID.
    // If not, we can grab it from the token stored in localStorage.
    
    // Quick method using localStorage if your login saves the token:
    const token = localStorage.getItem('token');
    if (token) {
       // Decode payload to get _id
       try {
         const payload = JSON.parse(atob(token.split('.')[1]));
         this.currentUserId = payload._id;
         console.log("Chat Active for User ID:", this.currentUserId);
       } catch (e) {
         console.error("Could not decode token", e);
       }
    }
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
  
  goToProfile() { this.router.navigate(['/profile']); }
  
  logout() { 
    localStorage.clear(); 
    this.router.navigate(['/login']); 
  }

  formatMessage(text: string): string {
    // ... (Keep your formatting logic for bolding and links) ...
    let safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    safeText = safeText.replace(/\n/g, '<br>');
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    safeText = safeText.replace(urlRegex, '<a href="$1" target="_blank" style="color: #4f46e5; text-decoration: underline;">$1</a>');
    return safeText;
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.isDiagnosisComplete) return;

    const textToSend = this.newMessage;
    this.newMessage = ''; 

    this.messages.push({
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    });

    this.isTyping = true;

    // PASS THE USER ID HERE
    this.triageService.sendMessage(textToSend, this.currentConversationId, this.currentUserId).subscribe({
      next: (response) => {
        this.isTyping = false;
        
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
     // ... (Keep your existing handleAiResponse logic) ...
     // It acts purely on the visual side. The saving happened in the backend.
     if (response.error) {
       // ... error handling
       return;
     }

     try {
       const aiData = JSON.parse(response.gpt_json);
       // ... existing logic to display message ...
       // (Copy your existing handleAiResponse logic here)
       
       const nextQuestion = aiData.next_question;
       let evidenceSection = "";
       if (aiData.evidence_used && aiData._retrieved && aiData._retrieved.length > 0) {
          evidenceSection += "\n\n📚 **MEDICAL SOURCES USED:**\n";
          aiData._retrieved.forEach((doc: any, index: number) => {
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
          finalReport += evidenceSection;

          this.messages.push({
            sender: 'bot',
            text: finalReport,
            timestamp: new Date().toISOString()
          });
       } else {
         this.messages.push({
           sender: 'bot',
           text: nextQuestion, // + evidenceSection if desired
           timestamp: new Date().toISOString()
         });
       }

     } catch(e) {
       console.error("Error parsing JSON", e);
     }
  }
}