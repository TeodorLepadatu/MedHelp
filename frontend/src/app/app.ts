import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. Import ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html', 
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  http = inject(HttpClient);
  cdr = inject(ChangeDetectorRef); // 2. Inject the detector
  message = ''; 

  ngOnInit() {
    this.http.get<any>('http://localhost:3000/api/message')
      .subscribe({
        next: (response) => {
          this.message = response.message;
          
          // 3. Force Angular to update the screen
          this.cdr.detectChanges(); 
          console.log('Screen updated with:', this.message);
        },
        error: (error) => {
          console.error('Error:', error);
        }
      });
  }
}