import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home'; 
import { RegisterComponent } from './components/register/register'; 
import { LoginComponent } from './components/login/login';

export const routes: Routes = [
    
    {path: '', redirectTo: 'home', pathMatch: 'full' },
    {path: 'home', component: HomeComponent },
    {path: 'register', component: RegisterComponent},
    {path: 'login', component: LoginComponent},


];