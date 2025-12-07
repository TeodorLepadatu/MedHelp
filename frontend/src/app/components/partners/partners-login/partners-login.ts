import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-partners-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './partners-login.html',
  styleUrls: ['./partners-login.css']
})
export class PartnersLoginComponent {
  
  credentials = {
    email: '',
    password: ''
  };

  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.loginPartner(this.credentials).subscribe({
      next: (response: any) => {
        console.log('Partner Login Successful');
        
        // 1. Save Token
        localStorage.setItem('token', response.token);
        
        // 2. Redirect to Partner Dashboard
        this.router.navigate(['/partners-dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login Failed', err);
        
        // Extract error message from backend if available
        if (err.error && typeof err.error === 'string') {
           this.errorMessage = err.error;
        } else if (err.error && err.error.message) {
           this.errorMessage = err.error.message; 
        } else {
           this.errorMessage = 'Invalid email or password.';
        }
      }
    });
  }
}