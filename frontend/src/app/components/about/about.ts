import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrls: ['./about.css']
})
export class AboutComponent {
  
  // Define the core mission and values for the component to use
  mission: string = 'Our social mission is to democratize health information by making expert-level preliminary analysis accessible to everyone, regardless of geography or economic status. We believe timely, secure, and accurate guidance is a fundamental right, not a privilege.';

  values = [
    { 
      icon: '🧠', 
      title: 'Accuracy & Trust', 
      description: 'We prioritize the integrity and reliability of our AI, continuously training it on verified medical knowledge to ensure the highest degree of accuracy.' 
    },
    { 
      icon: '🤝', 
      title: 'Accessibility & Equity', 
      description: 'We strive to remove barriers to preliminary care, offering our service at a low cost or free of charge to underserved communities worldwide.' 
    },
    { 
      icon: '📈', 
      title: 'Innovation & Growth', 
      description: 'We are committed to the relentless pursuit of technological advancement to improve diagnostic support and user experience.' 
    },
  ];

  // Optional: Back-to-home logic can be added here if needed
}