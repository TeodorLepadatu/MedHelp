import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Assuming you have this to get user name

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  userName: string = 'User';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Optional: Fetch the user's name from local storage or AuthService
    // const user = this.authService.getCurrentUser();
    // if (user) this.userName = user.firstName;
    
    // Simple fallback if you store name in localStorage during login
    const storedName = localStorage.getItem('firstName');
    if (storedName) this.userName = storedName;
  }

  logout() {
    this.authService.logout(); // Make sure your auth service has a logout method
    this.router.navigate(['/login']);
  }
}