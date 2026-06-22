import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CustomerSettingsProps {
  onBack: () => void;
}

interface CustomerSettingsState {
  // Customer Settings
  phoneValidationDelivery: boolean;
  phoneValidationPickUp: boolean;
  phoneValidationDineIn: boolean;
  minPhoneLength: string;
  maxPhoneLength: string;
  showCustomerEmail: boolean;
  createBillsWithTaxId: boolean;
  
  // Due Payment Settings
  phoneNumberMandatoryForDue: boolean;
}

const CustomerSettings: React.FC<CustomerSettingsProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState('customer');
  const [settings, setSettings] = useState<CustomerSettingsState>({
    phoneValidationDelivery: true,
    phoneValidationPickUp: false,
    phoneValidationDineIn: false,
    minPhoneLength: '10',
    maxPhoneLength: '10',
    showCustomerEmail: false,
    createBillsWithTaxId: true,
    phoneNumberMandatoryForDue: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('customerSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('customerSettings', JSON.stringify(settings));
    toast.success('Customer settings saved successfully');
  };

  const sections = [
    { id: 'customer', label: 'Customer Settings' },
    { id: 'duePayment', label: 'Due Payment Settings' },
  ];

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Outlet Settings &gt; Customer</h1>
          </div>
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r bg-background flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary border-l-4 border-primary'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content */}
        <ScrollArea className="flex-1 p-6 bg-muted/30">
          <div className="space-y-6 max-w-3xl">
            {activeSection === 'customer' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Customer Settings</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings help in configure the customer entry on billing screen.
                </p>

                {/* Phone Validation */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">
                      Customer phone validation on billing screen
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="phoneValidationDelivery"
                          checked={settings.phoneValidationDelivery}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, phoneValidationDelivery: checked as boolean })
                          }
                        />
                        <label htmlFor="phoneValidationDelivery" className="text-sm">
                          Delivery
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="phoneValidationPickUp"
                          checked={settings.phoneValidationPickUp}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, phoneValidationPickUp: checked as boolean })
                          }
                        />
                        <label htmlFor="phoneValidationPickUp" className="text-sm">
                          Pick Up
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="phoneValidationDineIn"
                          checked={settings.phoneValidationDineIn}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, phoneValidationDineIn: checked as boolean })
                          }
                        />
                        <label htmlFor="phoneValidationDineIn" className="text-sm">
                          Dine In
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600">
                      This settings enables validation of phone number of customer.
                    </p>
                    <p className="text-xs text-blue-600">
                      This setting is only available in cloud login.
                    </p>
                  </div>

                  {/* Min Phone Length */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      Minimum length for phone number (in digits) <span className="text-destructive">*</span>:
                    </label>
                    <Input
                      type="number"
                      value={settings.minPhoneLength}
                      onChange={(e) => setSettings({ ...settings, minPhoneLength: e.target.value })}
                      className="w-32 bg-muted/50"
                    />
                  </div>
                  <p className="text-xs text-blue-600 ml-52">
                    This setting is only available in cloud login.
                  </p>

                  {/* Max Phone Length */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium min-w-48">
                      Maximum length for phone number (in digits) <span className="text-destructive">*</span>:
                    </label>
                    <Input
                      type="number"
                      value={settings.maxPhoneLength}
                      onChange={(e) => setSettings({ ...settings, maxPhoneLength: e.target.value })}
                      className="w-32 bg-muted/50"
                    />
                  </div>
                  <p className="text-xs text-blue-600 ml-52">
                    This setting is only available in cloud login.
                  </p>

                  {/* Show Customer Email */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="showCustomerEmail"
                        checked={settings.showCustomerEmail}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, showCustomerEmail: checked as boolean })
                        }
                      />
                      <label htmlFor="showCustomerEmail" className="text-sm font-medium">
                        Show customer email on billing screen.
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      This setting is only available in cloud login.
                    </p>
                  </div>

                  {/* Create Bills with Tax ID */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="createBillsWithTaxId"
                        checked={settings.createBillsWithTaxId}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, createBillsWithTaxId: checked as boolean })
                        }
                      />
                      <label htmlFor="createBillsWithTaxId" className="text-sm font-medium">
                        Create bills with the tax authority with the TAX ID number available
                      </label>
                    </div>
                    <p className="text-xs text-blue-600 ml-6">
                      This setting is only available in cloud login.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'duePayment' && (
              <section className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-2">Due Payment settings</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The following settings configures the Due Payment module in billing screen.
                </p>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="phoneNumberMandatoryForDue"
                      checked={settings.phoneNumberMandatoryForDue}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, phoneNumberMandatoryForDue: checked as boolean })
                      }
                    />
                    <label htmlFor="phoneNumberMandatoryForDue" className="text-sm font-medium">
                      Customer Phone number mandatory when the due payment is selected
                    </label>
                  </div>
                  <p className="text-xs text-blue-600 ml-6">
                    This setting is only available in cloud login.
                  </p>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex justify-end bg-background">
        <Button variant="outline" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
};

export default CustomerSettings;
