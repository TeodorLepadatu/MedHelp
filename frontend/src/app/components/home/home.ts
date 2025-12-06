import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // <--- Essential for buttons to work

@Component({
  selector: 'app-home',
  standalone: true,
  // You must import RouterLink here so the HTML knows what routerLink="/login" means
  imports: [CommonModule, RouterLink], 
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {
  // Logic for the home page goes here (if any)
}