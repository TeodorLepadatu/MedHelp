import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TriageService {
  private baseUrl = 'http://127.0.0.1:8000'; 

  constructor(private http: HttpClient) { }

  // Update this method to accept userId
  sendMessage(message: string, conversationId: string | null, userId: string | null): Observable<any> {
    const payload = { 
      message: message, 
      conversation_id: conversationId,
      user_id: userId  // <--- Send this to Python
    };
    return this.http.post<any>(`${this.baseUrl}/chat_step`, payload);
  }
}