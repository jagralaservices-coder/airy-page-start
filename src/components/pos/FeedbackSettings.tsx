import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Star, QrCode, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface FeedbackConfig {
  enableFeedback: boolean;
  showFeedbackOnBill: boolean;
  showQROnBill: boolean;
  feedbackUrl: string;
  enableRatings: boolean;
  ratingScale: number;
  enableComments: boolean;
  requireRatingForComment: boolean;
  enableEmailFeedback: boolean;
  feedbackEmail: string;
  enableSMSFeedback: boolean;
  askForName: boolean;
  askForPhone: boolean;
  askForEmail: boolean;
  feedbackQuestions: string[];
  thankYouMessage: string;
  lowRatingAlertThreshold: number;
  enableLowRatingAlert: boolean;
}

interface FeedbackSettingsProps {
  onBack: () => void;
}

const defaultSettings: FeedbackConfig = {
  enableFeedback: true,
  showFeedbackOnBill: true,
  showQROnBill: true,
  feedbackUrl: '',
  enableRatings: true,
  ratingScale: 5,
  enableComments: true,
  requireRatingForComment: false,
  enableEmailFeedback: false,
  feedbackEmail: '',
  enableSMSFeedback: false,
  askForName: true,
  askForPhone: true,
  askForEmail: false,
  feedbackQuestions: ['How was the food quality?', 'How was the service?', 'How was the ambiance?'],
  thankYouMessage: 'Thank you for your valuable feedback!',
  lowRatingAlertThreshold: 3,
  enableLowRatingAlert: true
};

const FeedbackSettings: React.FC<FeedbackSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<FeedbackConfig>(defaultSettings);
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('feedback_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse feedback settings', e);
      }
    }
  }, []);

  const saveSettings = (newSettings: FeedbackConfig) => {
    setSettings(newSettings);
    localStorage.setItem('feedback_settings', JSON.stringify(newSettings));
    toast.success('Feedback settings saved');
  };

  const handleToggle = (key: keyof FeedbackConfig, value: boolean) => {
    saveSettings({ ...settings, [key]: value });
  };

  const handleTextChange = (key: keyof FeedbackConfig, value: string) => {
    saveSettings({ ...settings, [key]: value });
  };

  const handleNumberChange = (key: keyof FeedbackConfig, value: number) => {
    saveSettings({ ...settings, [key]: value });
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    saveSettings({ ...settings, feedbackQuestions: [...settings.feedbackQuestions, newQuestion.trim()] });
    setNewQuestion('');
  };

  const removeQuestion = (index: number) => {
    const updated = settings.feedbackQuestions.filter((_, i) => i !== index);
    saveSettings({ ...settings, feedbackQuestions: updated });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Feedback Settings</h1>
            <p className="text-sm text-muted-foreground">Configure customer feedback collection</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Basic Feedback Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Feedback Configuration
            </CardTitle>
            <CardDescription>Configure how feedback is collected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Feedback</Label>
                <p className="text-sm text-muted-foreground">Allow customers to submit feedback</p>
              </div>
              <Switch
                checked={settings.enableFeedback}
                onCheckedChange={(v) => handleToggle('enableFeedback', v)}
              />
            </div>

            {settings.enableFeedback && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Show Feedback Link on Bill</Label>
                    <p className="text-sm text-muted-foreground">Print feedback link on receipts</p>
                  </div>
                  <Switch
                    checked={settings.showFeedbackOnBill}
                    onCheckedChange={(v) => handleToggle('showFeedbackOnBill', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      Show QR Code on Bill
                    </Label>
                    <p className="text-sm text-muted-foreground">Print QR for quick feedback access</p>
                  </div>
                  <Switch
                    checked={settings.showQROnBill}
                    onCheckedChange={(v) => handleToggle('showQROnBill', v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Feedback URL (optional)</Label>
                  <Input
                    placeholder="https://feedback.yourstore.com"
                    value={settings.feedbackUrl}
                    onChange={(e) => handleTextChange('feedbackUrl', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">External feedback form URL</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rating Settings */}
        {settings.enableFeedback && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Rating Configuration
              </CardTitle>
              <CardDescription>Configure rating system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Ratings</Label>
                  <p className="text-sm text-muted-foreground">Allow star ratings</p>
                </div>
                <Switch
                  checked={settings.enableRatings}
                  onCheckedChange={(v) => handleToggle('enableRatings', v)}
                />
              </div>
              {settings.enableRatings && (
                <>
                  <div className="space-y-2">
                    <Label>Rating Scale</Label>
                    <Select
                      value={settings.ratingScale.toString()}
                      onValueChange={(v) => handleNumberChange('ratingScale', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 Stars</SelectItem>
                        <SelectItem value="10">10 Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Enable Low Rating Alert</Label>
                      <p className="text-sm text-muted-foreground">Get notified on low ratings</p>
                    </div>
                    <Switch
                      checked={settings.enableLowRatingAlert}
                      onCheckedChange={(v) => handleToggle('enableLowRatingAlert', v)}
                    />
                  </div>
                  {settings.enableLowRatingAlert && (
                    <div className="space-y-2">
                      <Label>Alert Threshold (Rating ≤)</Label>
                      <Input
                        type="number"
                        value={settings.lowRatingAlertThreshold}
                        onChange={(e) => handleNumberChange('lowRatingAlertThreshold', parseInt(e.target.value) || 2)}
                        min={1}
                        max={settings.ratingScale - 1}
                      />
                    </div>
                  )}
                </>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Comments</Label>
                  <p className="text-sm text-muted-foreground">Allow text feedback</p>
                </div>
                <Switch
                  checked={settings.enableComments}
                  onCheckedChange={(v) => handleToggle('enableComments', v)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Info */}
        {settings.enableFeedback && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>What details to ask from customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Ask for Name</Label>
                <Switch
                  checked={settings.askForName}
                  onCheckedChange={(v) => handleToggle('askForName', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ask for Phone</Label>
                <Switch
                  checked={settings.askForPhone}
                  onCheckedChange={(v) => handleToggle('askForPhone', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ask for Email</Label>
                <Switch
                  checked={settings.askForEmail}
                  onCheckedChange={(v) => handleToggle('askForEmail', v)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Questions */}
        {settings.enableFeedback && (
          <Card>
            <CardHeader>
              <CardTitle>Feedback Questions</CardTitle>
              <CardDescription>Custom questions to ask customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a question..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
                />
                <Button onClick={addQuestion}>Add</Button>
              </div>
              <div className="space-y-2">
                {settings.feedbackQuestions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">{q}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(i)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Thank You Message</Label>
                <Textarea
                  value={settings.thankYouMessage}
                  onChange={(e) => handleTextChange('thankYouMessage', e.target.value)}
                  placeholder="Message shown after feedback submission"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FeedbackSettings;
