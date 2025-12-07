import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-partners-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './partners-register.html',
  styleUrls: ['./partners-register.css']
})
export class PartnersRegisterComponent {
  
  partner = {
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    country: '',
    password: ''
  };

  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.registerPartner(this.partner).subscribe({
      next: (response) => {
        console.log('Registration Successful', response);
        // Show success message (optional) or just redirect
        alert('Institution Registered Successfully! Please log in.');
        this.router.navigate(['/partners-login']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Registration Failed', err);
        
        if (err.error && typeof err.error === 'string') {
           this.errorMessage = err.error;
        } else if (err.error && err.error.message) {
           this.errorMessage = err.error.message;
        } else {
           this.errorMessage = 'Registration failed. Please check your inputs.';
        }
      }
    });
  }
}