export interface OTPProvider {
  sendOTP(phone: string, otp: string): Promise<boolean>;
}

export class MSG91Provider implements OTPProvider {
  async sendOTP(phone: string, otp: string): Promise<boolean> {
    const authKey = Deno.env.get("MSG91_AUTH_KEY");
    const templateId = Deno.env.get("MSG91_TEMPLATE_ID");
    
    if (!authKey || !templateId) {
      throw new Error("MSG91 credentials missing. Please configure MSG91_AUTH_KEY and MSG91_TEMPLATE_ID.");
    }

    try {
      const response = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "authkey": authKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile: phone.replace('+', ''), // MSG91 expects number with country code without +
          otp: otp
        })
      });
      return response.ok;
    } catch (error) {
      console.error("MSG91 Error:", error);
      return false;
    }
  }
}

export class TwilioProvider implements OTPProvider {
  async sendOTP(phone: string, otp: string): Promise<boolean> {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Twilio credentials missing. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.");
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: `Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });
      return response.ok;
    } catch (error) {
      console.error("Twilio Error:", error);
      return false;
    }
  }
}

export class Fast2SMSProvider implements OTPProvider {
  async sendOTP(phone: string, otp: string): Promise<boolean> {
    const authKey = Deno.env.get("FAST2SMS_AUTH_KEY");

    if (!authKey) {
      throw new Error("Fast2SMS credentials missing. Please configure FAST2SMS_AUTH_KEY.");
    }

    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": authKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          variables_values: otp,
          route: "otp",
          numbers: phone.replace('+91', '') // Fast2SMS assumes Indian numbers without code
        })
      });
      return response.ok;
    } catch (error) {
      console.error("Fast2SMS Error:", error);
      return false;
    }
  }
}

export class TextlocalProvider implements OTPProvider {
  async sendOTP(phone: string, otp: string): Promise<boolean> {
    const apiKey = Deno.env.get("TEXTLOCAL_API_KEY");
    const sender = Deno.env.get("TEXTLOCAL_SENDER") || "TXTLCL";

    if (!apiKey) {
      throw new Error("Textlocal credentials missing. Please configure TEXTLOCAL_API_KEY.");
    }

    try {
      const url = "https://api.textlocal.in/send/";
      const body = new URLSearchParams({
        apikey: apiKey,
        numbers: phone,
        message: `Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,
        sender: sender
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });
      return response.ok;
    } catch (error) {
      console.error("Textlocal Error:", error);
      return false;
    }
  }
}

export function getOTPProvider(): OTPProvider {
  const activeProvider = Deno.env.get("OTP_PROVIDER")?.toLowerCase() || "msg91";
  
  switch (activeProvider) {
    case "msg91": return new MSG91Provider();
    case "twilio": return new TwilioProvider();
    case "fast2sms": return new Fast2SMSProvider();
    case "textlocal": return new TextlocalProvider();
    default: 
      // STRICT REQUIREMENT: No mock fallbacks allowed. 
      throw new Error(`Unsupported OTP_PROVIDER: ${activeProvider}. Must be one of msg91, twilio, fast2sms, textlocal.`);
  }
}
