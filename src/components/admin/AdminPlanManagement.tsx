import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  UtensilsCrossed, ShoppingBag, Crown, Check, X, Sparkles,
  Receipt, CreditCard, BarChart3, Package, Users, MapPin,
  MessageCircle, Truck, Brain, Building, QrCode, ChefHat, Puzzle
} from 'lucide-react';
import { FEATURES, type SubscriptionTier, type BusinessType } from '@/lib/subscriptionConfig';

const TIER_CONFIG: { value: SubscriptionTier; label: string; color: string; bgColor: string; icon: React.ReactNode }[] = [
  { 
    value: 'basic', label: 'Basic', 
    color: 'text-slate-700 font-bold', 
    bgColor: 'bg-white border border-slate-200 border-t-2 border-t-slate-400 hover:shadow-md hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1 rounded-2xl shadow-sm',
    icon: <Crown className="w-5 h-5 text-slate-400" />
  },
  { 
    value: 'gold', label: 'Gold', 
    color: 'text-amber-600 font-bold', 
    bgColor: 'bg-white border border-slate-200 border-t-2 border-t-amber-500 hover:shadow-md hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-1 rounded-2xl shadow-sm',
    icon: <Crown className="w-5 h-5 text-amber-500" />
  },
  { 
    value: 'platinum', label: 'Platinum', 
    color: 'text-violet-650 font-bold', 
    bgColor: 'bg-white border border-slate-200 border-t-2 border-t-violet-500 hover:shadow-md hover:border-violet-400 transition-all duration-300 transform hover:-translate-y-1 rounded-2xl shadow-sm',
    icon: <Crown className="w-5 h-5 text-violet-650" />
  },
];

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  billing: <Receipt className="w-4 h-4" />,
  gstInvoice: <CreditCard className="w-4 h-4" />,
  multiplePayments: <CreditCard className="w-4 h-4" />,
  basicReports: <BarChart3 className="w-4 h-4" />,
  menuManagement: <Package className="w-4 h-4" />,
  basicInventory: <Package className="w-4 h-4" />,
  manualInventory: <Package className="w-4 h-4" />,
  customerManagement: <Users className="w-4 h-4" />,
  support247: <MessageCircle className="w-4 h-4" />,
  barcodeScanner: <QrCode className="w-4 h-4" />,
  fullInventory: <Package className="w-4 h-4" />,
  recipeManagement: <ChefHat className="w-4 h-4" />,
  recipeInventory: <ChefHat className="w-4 h-4" />,
  advancedReports: <BarChart3 className="w-4 h-4" />,
  expenseTracking: <CreditCard className="w-4 h-4" />,
  tableManagement: <Building className="w-4 h-4" />,
  qrMenuOrdering: <QrCode className="w-4 h-4" />,
  staffManagement: <Users className="w-4 h-4" />,
  faceVerification: <Users className="w-4 h-4" />,
  geoFencing: <MapPin className="w-4 h-4" />,
  swiggyZomato: <Truck className="w-4 h-4" />,
  teamChat: <MessageCircle className="w-4 h-4" />,
  thirdPartyIntegration: <Puzzle className="w-4 h-4" />,
  multiOutlet: <Building className="w-4 h-4" />,
  centralDashboard: <BarChart3 className="w-4 h-4" />,
  apiIntegrations: <Puzzle className="w-4 h-4" />,
  alertsNotifications: <MessageCircle className="w-4 h-4" />,
  autoStockSystem: <Brain className="w-4 h-4" />,
  smartInventory: <Brain className="w-4 h-4" />,
  deliveryTracking: <Truck className="w-4 h-4" />,
  crmLoyalty: <Users className="w-4 h-4" />,
};

const CATEGORY_CONFIG = [
  { value: 'restaurant' as BusinessType, label: 'Restaurant', icon: UtensilsCrossed, color: 'text-orange-650' },
  { value: 'retail' as BusinessType, label: 'Retail Store', icon: ShoppingBag, color: 'text-blue-650' },
];

function getFeaturesForTier(tier: SubscriptionTier, businessType: BusinessType) {
  return Object.values(FEATURES).filter(f => {
    const requiredTier = businessType === 'restaurant' ? f.restaurant : f.retail;
    return requiredTier === tier;
  });
}

function isFeatureIncluded(featureKey: string, tier: SubscriptionTier, businessType: BusinessType): boolean {
  const feature = FEATURES[featureKey];
  if (!feature) return false;
  const requiredTier = businessType === 'restaurant' ? feature.restaurant : feature.retail;
  const tierLevel: Record<SubscriptionTier, number> = { basic: 1, gold: 2, platinum: 3 };
  return tierLevel[tier] >= tierLevel[requiredTier];
}

export const AdminPlanManagement: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<BusinessType>('restaurant');

  const allFeatureKeys = Object.keys(FEATURES);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 bg-clip-text text-transparent">Plan & Feature Management</h2>
        <p className="text-indigo-950/70 mt-1 text-sm font-semibold">View categories, plans, and their feature mappings</p>
      </div>

      {/* Category Selection */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as BusinessType)}>
        <TabsList className="grid w-full max-w-sm grid-cols-2 h-auto bg-slate-100 border border-slate-200 p-1 rounded-2xl shadow-sm">
          {CATEGORY_CONFIG.map(cat => (
            <TabsTrigger 
              key={cat.value} 
              value={cat.value} 
              className="rounded-xl py-2.5 text-sm font-medium transition-all gap-2 text-slate-650 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-650 data-[state=active]:text-white shadow-sm"
            >
              <cat.icon className={`w-4 h-4 ${cat.color}`} />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORY_CONFIG.map(cat => (
          <TabsContent key={cat.value} value={cat.value} className="mt-6">
            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TIER_CONFIG.map(tier => {
                const tierFeatures = getFeaturesForTier(tier.value, cat.value);
                const allIncluded = allFeatureKeys.filter(fk => isFeatureIncluded(fk, tier.value, cat.value));
                
                return (
                  <Card key={tier.value} className={`relative overflow-hidden ${tier.bgColor}`}>
                    {tier.value === 'gold' && (
                      <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black rounded-bl-lg uppercase tracking-wider shadow-md">
                        POPULAR
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {tier.icon}
                        <CardTitle className={`font-bold ${tier.color}`}>{tier.label} Plan</CardTitle>
                      </div>
                      <CardDescription className="text-slate-500 mt-1">
                        {tier.value === 'basic' && 'Essential features to get started'}
                        {tier.value === 'gold' && 'Advanced features for growing businesses'}
                        {tier.value === 'platinum' && 'Full suite with AI & multi-outlet'}
                      </CardDescription>
                      <Badge 
                        variant="outline" 
                        className={`w-fit text-[11px] mt-1.5 px-2.5 py-0.5 font-bold uppercase tracking-wider rounded-lg border ${
                          tier.value === 'basic' ? 'border-slate-200 bg-slate-50 text-slate-600' :
                          tier.value === 'gold' ? 'border-amber-200 bg-amber-50 text-amber-600' :
                          'border-violet-200 bg-violet-50 text-violet-700'
                        }`}
                      >
                        {allIncluded.length} features included
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[350px]">
                        <div className="px-6 pb-6 space-y-2">
                           {/* New features at this tier */}
                           {tierFeatures.length > 0 && (
                            <>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2 pb-1">
                                {tier.value === 'basic' ? 'Included' : `New in ${tier.label}`}
                              </p>
                              {tierFeatures.map(f => (
                                <div key={f.key} className="flex items-center gap-2.5 py-0.5">
                                  <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center flex-shrink-0">
                                    <Check className="w-3 h-3 text-emerald-600 font-bold" />
                                  </div>
                                  <span className="text-sm flex items-center gap-1.5 text-slate-800 font-medium">
                                    {FEATURE_ICONS[f.key] || <Sparkles className="w-4 h-4 text-violet-600" />}
                                    {f.label}
                                  </span>
                                  {f.isAddon && (
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-750 border border-indigo-200 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider rounded-md">Add-on</Badge>
                                  )}
                                </div>
                              ))}
                            </>
                          )}

                          {/* Inherited from lower tiers */}
                          {tier.value !== 'basic' && (
                            <>
                              <p className="text-[10px] font-bold text-slate-550 uppercase tracking-widest pt-3 pb-1">
                                + Everything in {tier.value === 'gold' ? 'Basic' : 'Gold'}
                              </p>
                              {allIncluded
                                .filter(fk => !tierFeatures.find(tf => tf.key === fk))
                                .slice(0, 5)
                                .map(fk => {
                                  const f = FEATURES[fk];
                                  return (
                                    <div key={fk} className="flex items-center gap-2.5 py-0.5 opacity-70">
                                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-slate-500" />
                                      </div>
                                      <span className="text-sm text-slate-600 font-medium">{f.label}</span>
                                    </div>
                                  );
                                })}
                              {allIncluded.filter(fk => !tierFeatures.find(tf => tf.key === fk)).length > 5 && (
                                <p className="text-xs text-slate-500 font-bold pl-7">
                                  +{allIncluded.filter(fk => !tierFeatures.find(tf => tf.key === fk)).length - 5} more...
                                </p>
                              )}
                            </>
                          )}

                          {/* Not included */}
                          {tier.value !== 'platinum' && (
                            <>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-3 pb-1">
                                Not included
                              </p>
                              {allFeatureKeys
                                .filter(fk => !isFeatureIncluded(fk, tier.value, cat.value))
                                .slice(0, 4)
                                .map(fk => {
                                  const f = FEATURES[fk];
                                  return (
                                    <div key={fk} className="flex items-center gap-2.5 py-0.5 opacity-50">
                                      <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-250 flex items-center justify-center flex-shrink-0">
                                        <X className="w-3 h-3 text-rose-500" />
                                      </div>
                                      <span className="text-sm text-slate-500 line-through font-medium">{f.label}</span>
                                    </div>
                                  );
                                })}
                            </>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Full Feature Comparison Table */}
            <Card className="mt-6 bg-white border border-slate-200 shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  Full Feature Comparison — {cat.label}
                </CardTitle>
                <CardDescription className="text-slate-500">Complete feature mapping across all plans</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-650 text-xs font-bold uppercase tracking-wider">
                        <th className="text-left p-4 font-bold tracking-wider">Feature</th>
                        {TIER_CONFIG.map(tier => (
                          <th key={tier.value} className={`text-center p-4 font-bold tracking-wider ${tier.color}`}>
                            {tier.label}
                          </th>
                        ))}
                        <th className="text-center p-4 font-bold tracking-wider text-slate-650">Add-on?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allFeatureKeys.map(fk => {
                        const f = FEATURES[fk];
                        return (
                          <tr key={fk} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 flex items-center gap-2.5 font-bold text-slate-800">
                              {FEATURE_ICONS[fk] || <Sparkles className="w-4 h-4 text-violet-600" />}
                              {f.label}
                            </td>
                            {TIER_CONFIG.map(tier => (
                              <td key={tier.value} className="text-center p-4">
                                {isFeatureIncluded(fk, tier.value, cat.value) ? (
                                  <Check className="w-5 h-5 text-emerald-600 mx-auto font-bold" />
                                ) : (
                                  <X className="w-5 h-5 text-slate-300 mx-auto" />
                                )}
                              </td>
                            ))}
                            <td className="text-center p-4">
                              {f.isAddon ? (
                                <Badge variant="outline" className="text-[10px] border-violet-200 bg-violet-50 text-violet-750 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Yes</Badge>
                              ) : (
                                <span className="text-slate-400 font-semibold">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminPlanManagement;
