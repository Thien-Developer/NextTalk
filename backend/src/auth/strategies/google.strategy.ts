import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, displayName, emails, photos } = profile;
    const email = emails?.[0]?.value ?? '';
    const avatarUrl = photos?.[0]?.value;

    try {
      const user = await this.authService.findOrCreateGoogleUser({
        googleId: id,
        email,
        displayName: displayName || email,
        avatarUrl,
      });
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
