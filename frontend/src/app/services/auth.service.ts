import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'; // Import Router
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http'; // Make sure to import this at the top

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:3000';
  private tokenTimer: any; // Variable to hold the timer

  constructor(private http: HttpClient, private router: Router) {}

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  getProfile(): Observable<any> {
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // 1. Create the URL with a timestamp
    const url = `${this.apiUrl}/profile?t=${new Date().getTime()}`;

    // 2. USE THE 'url' VARIABLE HERE! (You were using the old string before)
    return this.http.get(url, { headers }); 
  }

  login(credentials: any): Observable<any> {
    // We modify login to start the timer on success
    return new Observable(observer => {
      this.http.post(`${this.apiUrl}/login`, credentials).subscribe({
        next: (response: any) => {
          // If login successful, start the 15 min timer (15 * 60 * 1000 ms)
          this.autoLogout(15 * 60 * 1000); 
          observer.next(response);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  // Helper to check if logged in
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // THE LOGOUT FUNCTION
  logout() {
    console.log("Session expired or User logged out. Clearing data...");
    
    // 1. Remove Token
    localStorage.removeItem('token');
    
    // 2. Remove any other user data if you saved it
    localStorage.removeItem('user'); 

    // 3. Stop the timer so it doesn't trigger again
    if (this.tokenTimer) {
      clearTimeout(this.tokenTimer);
    }

    // 4. Redirect to Login
    this.router.navigate(['/login']);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); // Or wherever you store it
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  registerPartner(partnerData: any): Observable<any> {
    // Matches app.use('/partners', ...) in server.js
    return this.http.post(`${this.apiUrl}/partners/register`, partnerData);
  }

  loginPartner(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partners/login`, credentials);
  }

  getPartnerDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partners/dashboard`, { headers: this.getAuthHeaders() });
  }

  getPrediction(disease: string): Observable<any> {
  const payload = { disease };
  return this.http.post(`${this.apiUrl}/partners/predict`, payload, { headers: this.getAuthHeaders() });
}

getPartnerStatistics(country: string, disease: string): Observable<any> {
  // Use POST so we can send a body with filters easily
  return this.http.post(
    `${this.apiUrl}/partners/statistics`, 
    { country, disease },
    { headers: this.getAuthHeaders() }
  );
}

  // THE TIMER
  private autoLogout(expirationDuration: number) {
    console.log(`Session timer started for ${expirationDuration}ms`);
    this.tokenTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);

    
  }
}