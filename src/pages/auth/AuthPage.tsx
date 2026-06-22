import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { usePOS } from '@/contexts/POSContext';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/contexts/LocaleContext';
import { Eye, EyeOff, ArrowLeft, LogIn, Check, Clock, Crown, Building2, Store } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useOTP } from '@/hooks/useOTP';

const AuthPage: React.FC = () => {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  
  const [loginEmail, setLoginEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Owner specifics
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<'retail' | 'restaurant'>('retail');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  
  // Store specifics
  const [storeName, setStoreName] = useState('');
  const [ownerCode, setOwnerCode] = useState('');
  
  // OTP specifics
  const [otp, setOtp] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginErrorMsg, setLoginErrorMsg] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  // Routing states
  const [isSignup, setIsSignup] = useState(searchParams.get('signup') === 'true');
  const [signupStep, setSignupStep] = useState<'role_selection' | 'owner_form' | 'store_form' | 'otp' | 'membership' | 'pending' | 'form'>('form');
  const [signupComplete, setSignupComplete] = useState(false);
  
  const navigate = useNavigate();
  const { login, signup, resetPassword, isLoading: authLoading, userRole, isAuthenticated } = useSupabaseAuth();
  const { loginStore } = usePOS();
  const { toast } = useToast();
  const { sendOTP, verifyOTP, countdown, resetOTPState, isSent } = useOTP();

  const ownerSignupSchema = z.object({
    email: z.string().email(t('auth.validEmail')),
    password: z.string().min(6, t('auth.passwordMinLength')),
    fullName: z.string().min(1, t('auth.fullNameRequired')),
    phone: z.string().min(10, t('auth.phoneRequired')),
    businessName: z.string().min(1, t('auth.businessNameRequired')),
  });

  const storeSignupSchema = z.object({
    storeName: z.string().min(1, 'Store Name is required'),
    ownerCode: z.string().min(1, 'Owner Email or Code is required'),
    phone: z.string().min(10, t('auth.phoneRequired')),
    password: z.string().min(6, t('auth.passwordMinLength')),
  });

  useEffect(() => {
    if (isSignup && signupStep === 'form') {
      setSignupStep('role_selection');
    }
  }, [isSignup, signupStep]);

  const redirectByRole = (role: string) => {
    const lastPath = localStorage.getItem('pos_last_path');
    if (role !== 'admin' && role !== 'super_admin' && lastPath && lastPath.startsWith('/') && !lastPath.startsWith('//') && lastPath !== '/' && lastPath !== '/auth' && lastPath !== '/reset-password' && !lastPath.startsWith('/admin')) {
      try {
        navigate(lastPath, { replace: true });
        return;
      } catch (e) {}
    }
    switch (role) {
      case 'super_admin': 
      case 'admin': navigate('/admin/dashboard', { replace: true }); break;
      case 'owner': navigate('/dashboard', { replace: true }); break;
      case 'store_manager': navigate('/pos', { replace: true }); break;
      case 'staff': navigate('/staff-dashboard', { replace: true }); break;
      default: navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    if (!loginSuccess || !isAuthenticated) return;
    if (userRole) {
      setIsLoading(false);
      redirectByRole(userRole.role);
    }
  }, [loginSuccess, isAuthenticated, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoginErrorMsg(null);
    const trimmedEmail = loginEmail.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setErrors({ loginEmail: !trimmedEmail ? t('auth.validEmail') : '', password: !trimmedPassword ? t('auth.passwordRequired') : '' });
      return;
    }
    setIsLoading(true);
    try {
      if (!trimmedEmail.includes('@')) {
        const store = await loginStore(trimmedEmail, trimmedPassword);
        setIsLoading(false);
        if (!store) return;
        toast({ title: 'Login successful', description: `Welcome ${store.name}` });
        navigate('/pos', { replace: true });
        return;
      }

      const { error } = await login(trimmedEmail, trimmedPassword);
      if (error) {
        setIsLoading(false);
        setLoginErrorMsg(error);
        toast({ title: t('auth.loginFailed'), description: error, variant: 'destructive' });
        return;
      }
      setLoginSuccess(true);
    } catch (err) {
      setIsLoading(false);
      setLoginErrorMsg('Something went wrong');
      toast({ title: t('auth.loginFailed'), description: 'Something went wrong', variant: 'destructive' });
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate current form
    if (signupStep === 'owner_form') {
      try { ownerSignupSchema.parse({ email, password, fullName, phone, businessName }); }
      catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach(err => fieldErrors[err.path[0] as string] = err.message);
          setErrors(fieldErrors);
          return;
        }
      }
    } else if (signupStep === 'store_form') {
      try { storeSignupSchema.parse({ storeName, ownerCode, phone, password }); }
      catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach(err => fieldErrors[err.path[0] as string] = err.message);
          setErrors(fieldErrors);
          return;
        }
      }
    }

    setIsLoading(true);
    const success = await sendOTP(phone);
    if (success) {
      setSignupStep('otp');
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setIsLoading(true);
    const isVerified = await verifyOTP(phone, otp);
    setIsLoading(false);

    if (!isVerified) return;

    if (signupStep === 'otp') {
       if (businessName) {
         setSignupStep('membership');
       } else {
         await finalizeStoreSignup();
       }
    }
  };

  const finalizeStoreSignup = async () => {
    setIsLoading(true);
    try {
      const storeEmail = `store_${phone.replace('+91', '')}@pos.local`;
      const { error: signupError } = await signup(storeEmail, password, storeName);
      if (signupError) throw new Error(signupError);

      setSignupStep('pending');
      setSignupComplete(true);
      toast({ title: 'Store Created', description: 'Your store account is created.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOwnerSignupComplete = async () => {
    if (!selectedPlan) {
      toast({ title: t('auth.selectPlan'), description: t('auth.selectPlanDesc'), variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error: signupError } = await signup(email, password, fullName);
      if (signupError) throw new Error(signupError);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: customerError } = await supabase.from('customers').insert({
        owner_email: email,
        owner_name: fullName,
        business_name: businessName,
        phone: phone,
        subscription_plan: selectedPlan,
        business_type: businessType,
        approval_status: 'pending',
        is_active: false,
        phone_verified: true
      });

      if (customerError) console.error('Customer creation error:', customerError);
      setSignupStep('pending');
      setSignupComplete(true);
      toast({ title: t('auth.signupComplete'), description: t('auth.accountPendingApproval') });
    } catch (error: any) {
      toast({ title: t('auth.signupFailed'), description: error.message || t('common.error'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getHeaderTitle = () => {
    if (signupStep === 'role_selection') return 'Choose Account Type';
    if (signupStep === 'owner_form') return t('auth.ownerSignup');
    if (signupStep === 'store_form') return 'Store Signup';
    if (signupStep === 'otp') return 'Verify Mobile';
    if (signupStep === 'membership') return t('auth.selectPlan');
    if (signupStep === 'pending') return t('auth.pendingApprovalTitle');
    return t('auth.login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-3 sm:mb-4 h-9 sm:h-10 text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.backToHome')}
        </Button>

        <Card className="border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-4 sm:p-6 rounded-t-lg text-primary-foreground">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-primary-foreground/20 rounded-lg sm:rounded-xl">
                {signupStep === 'membership' ? <Crown className="w-6 h-6 sm:w-8 sm:h-8" /> :
                 signupStep === 'pending' ? <Clock className="w-6 h-6 sm:w-8 sm:h-8" /> :
                 isSignup ? <Building2 className="w-6 h-6 sm:w-8 sm:h-8" /> :
                 <LogIn className="w-6 h-6 sm:w-8 sm:h-8" />}
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold">{getHeaderTitle()}</h1>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6">
            {signupStep === 'role_selection' ? (
               <div className="space-y-4">
                 <Button onClick={() => setSignupStep('owner_form')} className="w-full h-16 flex items-center justify-start gap-4" variant="outline">
                    <Crown className="w-6 h-6" />
                    <div className="text-left">
                       <div className="font-bold">Register as Owner</div>
                       <div className="text-xs text-muted-foreground">For business owners & merchants</div>
                    </div>
                 </Button>
                 <Button onClick={() => setSignupStep('store_form')} className="w-full h-16 flex items-center justify-start gap-4" variant="outline">
                    <Store className="w-6 h-6" />
                    <div className="text-left">
                       <div className="font-bold">Register as Store</div>
                       <div className="text-xs text-muted-foreground">For branch stores connecting to an owner</div>
                    </div>
                 </Button>
                 <div className="text-center mt-4">
                   <Button variant="link" onClick={() => { setIsSignup(false); setSignupStep('form'); }}>
                     Already have an account? Login
                   </Button>
                 </div>
               </div>
            ) : signupStep === 'otp' ? (
               <form onSubmit={handleVerifyOTP} className="space-y-4 text-center">
                 <div className="mb-4">
                   <p className="text-sm text-muted-foreground">We sent a secure OTP to +91{phone.replace('+91','')}. Please enter it below.</p>
                 </div>
                 <div className="space-y-2 max-w-[250px] mx-auto text-left">
                   <Label htmlFor="otp">Enter 6-digit OTP</Label>
                   <Input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="------" maxLength={6} required className="text-center tracking-widest text-lg" />
                 </div>
                 <div className="flex flex-col gap-2 pt-4 items-center">
                   <Button type="submit" disabled={isLoading} className="w-full max-w-[250px]">
                     {isLoading ? 'Verifying...' : 'Verify OTP'}
                   </Button>
                   <div className="flex items-center gap-2 mt-2">
                     <Button type="button" variant="ghost" onClick={() => setSignupStep('form')} disabled={isLoading}>Back</Button>
                     <Button type="button" variant="link" disabled={countdown > 0 || isLoading} onClick={() => sendOTP(phone)}>
                       {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                     </Button>
                   </div>
                 </div>
               </form>
            ) : signupStep === 'pending' ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold">{t('auth.pendingApprovalTitle')}</h3>
                <p className="text-muted-foreground">{t('auth.pendingApprovalDesc')}</p>
                <Button variant="outline" onClick={() => navigate('/')} className="mt-4">{t('common.backToHome')}</Button>
              </div>
            ) : signupStep === 'membership' ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold">Select Membership Plan</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'basic', name: 'Basic', price: '₹999', duration: '/month', features: ['1 Store', 'Basic POS', 'Email Support'] },
                    { id: 'gold', name: 'Gold', price: '₹2499', duration: '/month', features: ['Up to 5 Stores', 'Advanced Reports', 'Priority Support'] },
                    { id: 'platinum', name: 'Platinum', price: '₹4999', duration: '/month', features: ['Unlimited Stores', 'All Features', '24/7 Support'] },
                  ].map((plan) => (
                    <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan.id)} className={cn('w-full p-4 rounded-lg border-2 text-left transition-all relative', selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'border-border')}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">{plan.features.join(' • ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{plan.price}</p>
                          <p className="text-xs text-muted-foreground">{plan.duration}</p>
                        </div>
                      </div>
                      {selectedPlan === plan.id && <div className="absolute top-2 right-2"><Check className="w-5 h-5 text-primary" /></div>}
                    </button>
                  ))}
                </div>
                <Button onClick={handleOwnerSignupComplete} disabled={isLoading || !selectedPlan} className="w-full">
                  {isLoading ? t('auth.creating') : t('auth.completeSignup')}
                </Button>
              </div>
            ) : (
              <form onSubmit={!isSignup ? handleLogin : handleSendOTP} className="space-y-4">
                {signupStep === 'owner_form' && (
                  <>
                    <div className="space-y-2"><Label>Full Name *</Label><Input value={fullName} onChange={e=>setFullName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Email *</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Business Name *</Label><Input value={businessName} onChange={e=>setBusinessName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Business Type *</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={businessType} onChange={e=>setBusinessType(e.target.value as any)}>
                        <option value="retail">Retail</option>
                        <option value="restaurant">Restaurant</option>
                      </select>
                    </div>
                    <div className="space-y-2"><Label>Mobile Number (10 digits) *</Label><Input type="tel" pattern="[6-9][0-9]{9}" placeholder="9876543210" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Password *</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
                  </>
                )}
                {signupStep === 'store_form' && (
                  <>
                    <div className="space-y-2"><Label>Store Name *</Label><Input value={storeName} onChange={e=>setStoreName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Owner Code / Email *</Label><Input value={ownerCode} onChange={e=>setOwnerCode(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Store Mobile Number *</Label><Input type="tel" pattern="[6-9][0-9]{9}" placeholder="9876543210" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Password *</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
                  </>
                )}
                {!isSignup && (
                  <>
                    {loginErrorMsg && (
                      <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <span>{loginErrorMsg}</span>
                      </div>
                    )}
                    <div className="space-y-2"><Label>Email</Label><Input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
                  </>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Processing...' : (isSignup ? 'Send OTP' : 'Login')}
                </Button>

                <div className="text-center mt-4">
                   <Button variant="link" type="button" onClick={() => { setIsSignup(!isSignup); setSignupStep(isSignup ? 'form' : 'role_selection'); }}>
                     {isSignup ? 'Already have an account? Login' : 'Don\'t have an account? Sign up'}
                   </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
