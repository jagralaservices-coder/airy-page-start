import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WifiOff, Server, Activity, Eye, ArrowLeft } from 'lucide-react';

interface LogsViewerProps {
  onBack: () => void;
}

interface LogEntry {
  id: string;
  type: 'internet' | 'server' | 'functional';
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  entries: string[];
}

interface DayLogs {
  date: string;
  displayDate: string;
  logs: LogEntry[];
}

// Sample log data
const generateSampleLogs = (): DayLogs[] => {
  const today = new Date();
  const logs: DayLogs[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    let displayDate = dateStr;
    if (i === 0) displayDate = 'Today';
    else if (i === 1) displayDate = 'Yesterday';

    const dayLogs: LogEntry[] = [
      {
        id: `internet-${dateStr}`,
        type: 'internet',
        title: 'Internet Connectivity Logs',
        icon: WifiOff,
        entries: [
          `${dateStr} 09:15:23 - Connection established`,
          `${dateStr} 10:30:45 - Network latency: 45ms`,
          `${dateStr} 14:22:11 - Connection stable`,
          `${dateStr} 18:05:33 - Bandwidth: 100Mbps`
        ]
      },
      {
        id: `server-${dateStr}`,
        type: 'server',
        title: 'Server Connectivity Logs',
        icon: Server,
        entries: [
          `${dateStr} 09:00:00 - Server connected`,
          `${dateStr} 12:00:00 - Heartbeat OK`,
          `${dateStr} 15:30:00 - Data sync completed`,
          `${dateStr} 20:00:00 - Session active`
        ]
      }
    ];

    // Add functional error logs only for some days
    if (i === 0 || i === 3) {
      dayLogs.push({
        id: `functional-${dateStr}`,
        type: 'functional',
        title: 'Functional Error Logs',
        icon: Activity,
        entries: [
          `${dateStr} 11:45:22 - Warning: Slow query detected`,
          `${dateStr} 13:20:15 - Info: Cache cleared`,
          `${dateStr} 16:55:40 - Error: Payment timeout (retried successfully)`
        ]
      });
    }

    logs.push({
      date: dateStr,
      displayDate,
      logs: dayLogs
    });
  }

  return logs;
};

export const LogsViewer: React.FC<LogsViewerProps> = ({ onBack }) => {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  
  const logsData = generateSampleLogs();

  const handleViewLog = (log: LogEntry) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Logs</h2>
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Logs by Date */}
      <div className="space-y-4">
        {logsData.map((dayLog) => (
          <div key={dayLog.date} className="rounded-xl border border-border bg-card p-4">
            {/* Date Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-sm font-medium text-foreground">{dayLog.displayDate}</span>
            </div>

            {/* Log Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dayLog.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <log.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{log.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewLog(log)}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Log Details Dialog */}
      <Dialog open={showLogDetails} onOpenChange={setShowLogDetails}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && <selectedLog.icon className="w-5 h-5" />}
              {selectedLog?.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              View log entries for {selectedLog?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {selectedLog?.entries.map((entry, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 font-mono text-xs text-foreground"
              >
                {entry}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowLogDetails(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
