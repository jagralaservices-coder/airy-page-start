import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Terminal, Shield, Plus, Copy, RefreshCw, Ban, MoreVertical,
  ExternalLink, Globe, Pencil, Trash2, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  status: 'active' | 'revoked';
  permission: 'READ/WRITE' | 'READ';
  created: string;
  lastUsed: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

const APIManagementPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([
    { id: '1', name: 'Production Mobile POS', prefix: 'pk_live_8f2...', status: 'active', permission: 'READ/WRITE', created: 'Oct 12, 2023', lastUsed: '2 mins ago' },
    { id: '2', name: 'Staging Web App', prefix: 'pk_test_3x7...', status: 'active', permission: 'READ', created: 'Nov 20, 2023', lastUsed: '1 hour ago' },
    { id: '3', name: 'Legacy Desktop Key', prefix: 'pk_old_4x9...', status: 'revoked', permission: 'READ/WRITE', created: 'Jan 05, 2023', lastUsed: 'N/A' },
  ]);

  const [webhooks] = useState<Webhook[]>([
    { id: '1', url: 'https://api.merchant-app.com/v1/webhook', events: ['payment.success', 'order.created', 'inventory.low'], active: true },
    { id: '2', url: 'https://analytics.store.io/events', events: ['order.created', 'refund.processed'], active: false },
  ]);

  const revokeKey = (id: string) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k));
    toast({ title: 'API key revoked' });
  };

  const activeKeys = keys.filter(k => k.status === 'active').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-foreground">API Management</h1>
          </div>
          <button className="text-xs text-primary font-medium flex items-center gap-1">
            Docs <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5 pb-24">
        {/* Security Warning */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-foreground text-sm">Security Notice</h3>
            <p className="text-xs text-muted-foreground mt-0.5">API keys grant access to your store data. Keep them secure and rotate regularly.</p>
            <button className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
              Learn more <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* API Keys Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">API Keys</h2>
            <Badge variant="secondary" className="text-xs">{activeKeys} Active</Badge>
          </div>

          <Button className="w-full rounded-xl h-11 mb-4 font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Create New API Key
          </Button>

          <div className="space-y-3">
            {keys.map(key => (
              <div
                key={key.id}
                className={cn(
                  'bg-card border border-border rounded-2xl p-4',
                  key.status === 'revoked' && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className={cn('font-bold text-foreground', key.status === 'revoked' && 'italic')}>
                      {key.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={key.status === 'active' ? 'default' : 'secondary'}
                        className={cn('text-[10px] h-5', key.status === 'active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground')}
                      >
                        {key.status.toUpperCase()}
                      </Badge>
                      {key.status === 'active' && (
                        <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30">
                          {key.permission}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {key.status === 'active' && (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5 text-sm mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Key Prefix</span>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{key.prefix}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Created</span>
                    <span className="text-xs text-foreground">{key.created}</span>
                  </div>
                  {key.status === 'active' && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Last Used</span>
                      <span className="text-xs text-foreground">{key.lastUsed}</span>
                    </div>
                  )}
                </div>

                {key.status === 'active' && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-primary py-1.5"
                      onClick={() => { navigator.clipboard.writeText(key.prefix); toast({ title: 'Key copied!' }); }}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground py-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-destructive py-1.5"
                      onClick={() => revokeKey(key.id)}
                    >
                      <Ban className="w-3.5 h-3.5" /> Revoke
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Management */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Webhook Management</h2>
              <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {webhooks.map(wh => (
              <div key={wh.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {wh.active ? 'Active Endpoint' : 'Inactive Endpoint'}
                  </span>
                  <span className={cn('w-2.5 h-2.5 rounded-full', wh.active ? 'bg-success' : 'bg-muted-foreground')} />
                </div>

                <p className="text-xs font-mono text-primary truncate mb-3">{wh.url}</p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {wh.events.map((ev, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] rounded-full">{ev}</Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <button className="text-xs text-muted-foreground flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button className="text-xs text-destructive flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIManagementPage;
