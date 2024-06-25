import { HttpsProxyAgent } from 'https-proxy-agent';
import { Scraper } from './scraper';
import fs from 'fs/promises';
import * as tough from 'tough-cookie';

export interface ScraperTestOptions {
  /**
   * Force the scraper to use username/password to authenticate instead of cookies. Only used
   * by this file for testing auth, but very unreliable. Should always use cookies to resume
   * session when possible.
   */
  authMethod: 'password' | 'cookies' | 'anonymous';
}

export async function getScraper(
  options: Partial<ScraperTestOptions> = { authMethod: 'cookies' },
) {
  const username = process.env['TWITTER_USERNAME'];
  const password = process.env['TWITTER_PASSWORD'];
  const email = process.env['TWITTER_EMAIL'];
  const twoFactorSecret = process.env['TWITTER_2FA_SECRET'];
  const proxyUrl = process.env['PROXY_URL'];
  // const cookies = process.env['TWITTER_COOKIES'];
  const cookies = await getCookiesIfExist();
  let agent: any;

  if (options.authMethod === 'cookies' && !cookies) {
    console.warn(
      'TWITTER_COOKIES variable is not defined, reverting to password auth (not recommended)',
    );
    options.authMethod = 'password';
  }

  if (options.authMethod === 'password' && !(username && password)) {
    throw new Error(
      'TWITTER_USERNAME and TWITTER_PASSWORD variables must be defined.',
    );
  }

  if (proxyUrl) {
    agent = new HttpsProxyAgent(proxyUrl, {
      rejectUnauthorized: false,
    });
  }

  const scraper = new Scraper({
    transform: {
      request: (input, init) => {
        if (agent) {
          return [input, { ...init, agent }];
        }
        return [input, init];
      },
    },
    userAgent: process.env.USER_AGENT,
  });

  if (options.authMethod === 'password') {
    await scraper.login(username!, password!, email, twoFactorSecret);
    const cookies = await scraper.getCookies();
    await fs.writeFile('cookies.json', JSON.stringify(cookies), {
      encoding: 'utf8',
    });
  } else if (options.authMethod === 'cookies') {
    // await scraper.setCookies(JSON.parse(cookies!));
    await scraper.setCookies(cookies);
  }

  return scraper;
}

export async function getCookiesIfExist() {
  try {
    const cookiesFilePath = 'cookies.json';
    const cookiesString = await fs.readFile(cookiesFilePath, {
      encoding: 'utf8',
    });
    const cookies = JSON.parse(cookiesString).map(
      (i: any) => new tough.Cookie(i),
    );
    return cookies;
  } catch (e) {
    console.warn(e);
    return undefined;
  }
}
