import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  // Updated User Object
  user = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    password: '',
    // New Fields
    weight: null, // initialized as null for number inputs
    height: null,
    country: '',
    sex: '', // Will map to a select dropdown
    previousConditions: '',
    familyConditions: ''
  };

  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.isLoading = true;   
    this.errorMessage = ''; 

    this.authService.register(this.user).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Registration successful', response);
        alert('Registration successful! Please log in.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isLoading = false; 
        console.error('Registration failed', error);

        if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else if (error.error && error.error.error) {
           this.errorMessage = error.error.error;
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
      }
    });
  }
}