import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // 1. Import Router
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };
  
  errorMessage: string = '';
  isLoading: boolean = false;

  // 2. Inject Router in the constructor
  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        // --- CRITICAL STEP START ---
        
        // 1. Debug: Check exactly what the backend sent
        console.log('Backend Response:', response);

        // 2. Extract the token (Check your console log if 'token' is the wrong name!)
        const token = response.token || response.accessToken || response.jwt;

        if (token) {
           // 3. Save the token
           localStorage.setItem('token', token);
           
           // 4. Navigate to Chat
           console.log('Navigating to chat...');
           this.router.navigate(['/dashbord']); 
        } else {
           this.errorMessage = 'Login successful, but no token received.';
        }
        
        // --- CRITICAL STEP END ---
      },
      error: (error) => {
        this.isLoading = false;
        console.error(error);
        this.errorMessage = 'Invalid email or password';
      }
    });
  }
}