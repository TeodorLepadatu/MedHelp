import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-partners-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './partners-landing.html',
  styleUrls: ['./partners-landing.css']
})
export class PartnersLandingComponent {}