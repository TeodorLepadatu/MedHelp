import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TriageService {
  // Matches your running FastAPI server
  private apiUrl = 'http://127.0.0.1:8000/triage_step'; 

  constructor(private http: HttpClient) { }

  sendMessage(history: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { history: history });
  }
}