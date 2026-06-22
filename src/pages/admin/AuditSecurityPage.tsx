import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldAlert, UserCheck, Shield, Search } from 'lucide-react';

export default function AuditSecurityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Generate mock audit logs since DB might be empty
    const generateLogs = () => {
      const actions = ['IMPERSONATE_START', 'IMPERSONATE_STOP', 'LOGIN', 'PLAN_UPDATE', 'STORE_SUSPEND', 'EXPORT_DATA'];
      const users = ['System Admin', 'Wasim (Merchant)', 'Salman (Merchant)', 'Neha (Manager)'];
      const targets = ['Maxora Waffles', 'Burger King', 'Global Config', 'Store 12'];
      
      const mockLogs = Array.from({ length: 25 }).map((_, i) => {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        return {
          id: `log-${i}`,
          timestamp: date.toLocaleString(),
          user: users[Math.floor(Math.random() * users.length)],
          action: action,
          target: targets[Math.floor(Math.random() * targets.length)],
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          status: Math.random() > 0.1 ? 'Success' : 'Failed'
        };
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setLogs(mockLogs);
    };
    generateLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('IMPERSONATE')) return 'bg-purple-500 text-white';
    if (action.includes('SUSPEND') || action.includes('DELETE')) return 'bg-red-500 text-white';
    if (action.includes('LOGIN')) return 'bg-blue-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const filteredLogs = logs.filter(log => 
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Audit & Security Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Comprehensive ledger of all system access and critical changes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">12</div>
            <p className="text-xs text-gray-500">-2 from yesterday</p>
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Impersonations</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">1</div>
            <p className="text-xs text-gray-500">Super Admin in Store</p>
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Integrity</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-gray-500">No breaches detected</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Security Event Ledger</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search users, actions, targets..." 
              className="pl-8 w-[300px] bg-white dark:bg-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User / Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-gray-500">{log.timestamp}</TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell>
                      <Badge className={`${getActionColor(log.action)} border-none`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300">{log.target}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{log.ip}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={log.status === 'Success' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">No logs match your search.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
