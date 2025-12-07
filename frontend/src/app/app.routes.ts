import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home'; 
import { RegisterComponent } from './components/register/register'; 
import { LoginComponent } from './components/login/login';
import { ChatComponent } from './components/chat/chat';
import { authGuard } from './guards/auth.guard';
import { ProfileComponent } from './components/profile/profile';
import { AboutComponent } from './components/about/about';
import { DashboardComponent } from './components/dashbord/dashboard';
import { HistoryComponent } from './components/history/history';

import { PartnersLandingComponent } from './components/partners/partners-landing/partners-landing';
import { PartnersRegisterComponent } from './components/partners/partners-register/partners-register';
import { PartnersLoginComponent } from './components/partners/partners-login/partners-login';
import { PartnersDashboardComponent } from './components/partners/partners-dashboard/partners-dashboard';
import { PartnersPredictionsComponent } from './components/partners/partners-predictions/partners-predictions';
import { PartnersStatisticsComponent } from './components/partners/partners-statistics/partners-statistics';

export const routes: Routes = [
    
    {path: '', redirectTo: 'home', pathMatch: 'full' },
    {path: 'home', component: HomeComponent },
    {path: 'register', component: RegisterComponent},
    {path: 'login', component: LoginComponent},
    {path: 'chat', component: ChatComponent, canActivate: [authGuard]},
    {path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
    {path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    {path: 'about', component: AboutComponent},
    {path: 'history', component: HistoryComponent, canActivate: [authGuard] },

    { path: 'partners', component: PartnersLandingComponent },
    { path: 'partners-register', component: PartnersRegisterComponent },
    { path: 'partners-login', component: PartnersLoginComponent },
    { path: 'partners-dashboard', component: PartnersDashboardComponent, canActivate: [authGuard] },
    { path: 'partners-statistics', component: PartnersStatisticsComponent, canActivate: [authGuard]},
    { path: 'partners-predictions', component: PartnersPredictionsComponent, canActivate: [authGuard]}



];