import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // <--- 1. Import Router
import { TriageService } from '../../services/triage.service';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  isTyping: boolean = false;
  isDropdownOpen: boolean = false;

  conversationHistory: string = '';
  isDiagnosisComplete: boolean = false;

  constructor(
    private triageService: TriageService,
    private router: Router  // <--- 2. Inject Router here
  ) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // --- NEW NAVIGATION LOGIC ---

  goToProfile() { 
    this.isDropdownOpen = false; // Close the menu
    this.router.navigate(['/profile']); // <--- Update this path to your actual profile page route
  }

  logout() { 
    this.isDropdownOpen = false; // Close the menu
    // Clear any saved data/tokens if you have them
    localStorage.clear(); 
    this.router.navigate(['/login']); // <--- Update this path to your actual login page route
  }

  // ---------------------------

  sendMessage() {
    if (!this.newMessage.trim() || this.isDiagnosisComplete) return;

    const userText = this.newMessage;
    this.newMessage = ''; 

    this.messages.push({
      sender: 'user',
      text: userText,
      timestamp: new Date()
    });

    if (this.conversationHistory === '') {
      this.conversationHistory = `Patient initial complaint: ${userText}`;
    } else {
      this.conversationHistory += ` | Answer: ${userText}`;
    }

    this.isTyping = true;

    this.triageService.sendMessage(this.conversationHistory).subscribe({
      next: (response) => {
        this.isTyping = false;
        this.handleAiResponse(response);
      },
      error: (error) => {
        this.isTyping = false;
        console.error('Error:', error);
        this.messages.push({
          sender: 'bot',
          text: "I'm having trouble connecting to the medical server. Is server.py running?",
          timestamp: new Date()
        });
      }
    });
  }

  private handleAiResponse(response: any) {
    try {
      const aiData = JSON.parse(response.gpt_json);
      const nextQuestion = aiData.next_question;

      if (nextQuestion === 'DIAGNOSIS_COMPLETE') {
        this.isDiagnosisComplete = true;
        
        let finalReport = "📋 **FINAL MEDICAL ANALYSIS**\n\n";
        
        if (aiData.candidates && aiData.candidates.length > 0) {
          finalReport += "Top Suspected Conditions:\n";
          const sorted = aiData.candidates.sort((a: any, b: any) => b.probability - a.probability);
          sorted.forEach((c: any) => {
            const pct = Math.round(c.probability * 100);
            finalReport += `• ${c.condition} (${pct}%)\n`;
          });
        }

        finalReport += `\n💡 **ADVICE:**\n${aiData.top_recommendation}`;

        this.messages.push({
          sender: 'bot',
          text: finalReport,
          timestamp: new Date()
        });

      } else {
        this.messages.push({
          sender: 'bot',
          text: nextQuestion,
          timestamp: new Date()
        });
        this.conversationHistory += ` | Question: ${nextQuestion}`;
      }

    } catch (e) {
      console.error("Error parsing AI JSON", e);
      this.messages.push({
        sender: 'bot',
        text: "Error processing the medical analysis.",
        timestamp: new Date()
      });
    }
  }
}