import React, { useState } from 'react';
import { toast } from 'sonner';
import { useIncidents } from '@/context/useIncidents';
import { IncidentSeverity } from '@/types/incident';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'malware', label: 'Malware' },
  { value: 'phishing', label: 'Phishing' },
  { value: 'dos', label: 'DoS' },
  { value: 'data-breach', label: 'Data Breach' },
  { value: 'unauthorized-access', label: 'Unauthorized Access' },
  { value: 'tcp-scan', label: 'TCP Scan' },
  { value: 'invalid-tcp-flags', label: 'Invalid TCP Flags' },
  { value: 'tcp-handshake-violation', label: 'TCP Handshake Violation' },
  { value: 'other', label: 'Other' },
];

const initialFormState = {
  title: '',
  description: '',
  severity: '' as string,
  type: '' as string,
  sourceIP: '',
  destinationIPs: '',
  country: '',
  responder: '',
};

const CreateIncidentDialog: React.FC<CreateIncidentDialogProps> = ({ open, onOpenChange }) => {
  const { addIncident } = useIncidents();
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setForm(initialFormState);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.severity) {
      toast.error('Severity is required');
      return;
    }
    if (!form.type) {
      toast.error('Type is required');
      return;
    }
    if (!form.sourceIP.trim()) {
      toast.error('Source IP is required');
      return;
    }

    setSubmitting(true);

    try {
      const destinationIPs = form.destinationIPs
        .split(',')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);

      await addIncident({
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity as IncidentSeverity,
        type: form.type,
        status: 'open',
        sourceIP: form.sourceIP.trim(),
        destinationIPs: destinationIPs.length > 0 ? destinationIPs : undefined,
        country: form.country.trim() || undefined,
        responder: form.responder.trim() || undefined,
        timelineEvents: [],
      });

      toast.success('Incident created successfully');
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create incident:', err);
      toast.error('Failed to create incident');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Create New Incident</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">
              Title <span className="text-red-400">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Incident title"
              value={form.title}
              onChange={handleInputChange}
              className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">
              Description
            </Label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe the incident..."
              value={form.description}
              onChange={handleInputChange}
              rows={3}
              className="flex w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Severity & Type row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Severity */}
            <div className="space-y-2">
              <Label className="text-gray-300">
                Severity <span className="text-red-400">*</span>
              </Label>
              <Select value={form.severity} onValueChange={(val) => handleSelectChange('severity', val)}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {SEVERITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-gray-100 focus:bg-gray-700 focus:text-gray-100">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-gray-300">
                Type <span className="text-red-400">*</span>
              </Label>
              <Select value={form.type} onValueChange={(val) => handleSelectChange('type', val)}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-gray-100 focus:bg-gray-700 focus:text-gray-100">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source IP */}
          <div className="space-y-2">
            <Label htmlFor="sourceIP" className="text-gray-300">
              Source IP <span className="text-red-400">*</span>
            </Label>
            <Input
              id="sourceIP"
              name="sourceIP"
              placeholder="e.g. 192.168.1.100"
              value={form.sourceIP}
              onChange={handleInputChange}
              className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
              required
            />
          </div>

          {/* Destination IPs */}
          <div className="space-y-2">
            <Label htmlFor="destinationIPs" className="text-gray-300">
              Destination IPs <span className="text-gray-500 text-xs font-normal">(comma-separated, optional)</span>
            </Label>
            <Input
              id="destinationIPs"
              name="destinationIPs"
              placeholder="e.g. 10.0.0.1, 10.0.0.2"
              value={form.destinationIPs}
              onChange={handleInputChange}
              className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
            />
          </div>

          {/* Country & Responder row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="text-gray-300">
                Country <span className="text-gray-500 text-xs font-normal">(optional)</span>
              </Label>
              <Input
                id="country"
                name="country"
                placeholder="e.g. United States"
                value={form.country}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>

            {/* Responder */}
            <div className="space-y-2">
              <Label htmlFor="responder" className="text-gray-300">
                Responder <span className="text-gray-500 text-xs font-normal">(optional)</span>
              </Label>
              <Input
                id="responder"
                name="responder"
                placeholder="e.g. John Doe"
                value={form.responder}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {submitting ? 'Creating...' : 'Create Incident'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateIncidentDialog;
