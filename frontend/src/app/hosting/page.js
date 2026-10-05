'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Server,
  Plus,
  Search,
  Building,
  Calendar,
  Edit3,
  Trash2,
  FileText,
  Loader2,
  Cpu,
  Network,
} from 'lucide-react';
import hostingApi from '@/api/hosting.api';
import clientsApi from '@/api/clients.api';
import { useToast } from '@/components/common/ToastProvider';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import InputField from '@/components/common/InputField';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import EmptyState from '@/components/common/EmptyState';
import ErrorMessage from '@/components/common/ErrorMessage';
import { getExpiryStatus, formatDate } from '@/utils/date.utils';

export default function HostingPage() {
  const toast = useToast();

  const [hostings, setHostings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Form State (Create / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingHosting, setEditingHosting] = useState(null);
  const [formData, setFormData] = useState({
    client: '',
    hostingName: '',
    provider: '',
    hostname: '',
    serverIp: '',
    expiryDate: '',
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirm State
  const [deletingHosting, setDeletingHosting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch hostings & clients from real backend API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hostingsRes, clientsRes] = await Promise.all([
        hostingApi.getAll(),
        clientsApi.getAll(),
      ]);

      if (hostingsRes?.success && Array.isArray(hostingsRes.data)) {
        setHostings(hostingsRes.data);
      } else {
        setHostings([]);
      }

      if (clientsRes?.success && Array.isArray(clientsRes.data)) {
        setClients(clientsRes.data);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load hosting records. Please try again.');
      toast.error('Failed to load hosting records.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter hostings by search query
  const filteredHostings = useMemo(() => {
    if (!searchQuery.trim()) return hostings;
    const q = searchQuery.toLowerCase();
    return hostings.filter(
      (h) =>
        h.hostingName?.toLowerCase().includes(q) ||
        h.provider?.toLowerCase().includes(q) ||
        h.hostname?.toLowerCase().includes(q) ||
        h.serverIp?.toLowerCase().includes(q) ||
        h.client?.name?.toLowerCase().includes(q) ||
        h.client?.company?.toLowerCase().includes(q)
    );
  }, [hostings, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingHosting(null);
    setFormData({
      client: clients[0]?._id || '',
      hostingName: '',
      provider: '',
      hostname: '',
      serverIp: '',
      expiryDate: '',
      notes: '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (hosting) => {
    setEditingHosting(hosting);
    const dateFormatted = hosting.expiryDate
      ? new Date(hosting.expiryDate).toISOString().split('T')[0]
      : '';

    setFormData({
      client: typeof hosting.client === 'object' ? hosting.client?._id : hosting.client || '',
      hostingName: hosting.hostingName || '',
      provider: hosting.provider || '',
      hostname: hosting.hostname || '',
      serverIp: hosting.serverIp || '',
      expiryDate: dateFormatted,
      notes: hosting.notes || '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Submit Form (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.hostingName.trim()) {
      setFormError('Hosting / Server name is required.');
      return;
    }

    if (!editingHosting && !formData.client) {
      setFormError('Please select a client for this hosting plan.');
      return;
    }

    if (!formData.expiryDate) {
      setFormError('Expiry date is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingHosting) {
        // Update hosting (PUT /api/hosting/:id)
        const res = await hostingApi.update(editingHosting._id, {
          hostingName: formData.hostingName.trim(),
          provider: formData.provider.trim(),
          hostname: formData.hostname.trim(),
          serverIp: formData.serverIp.trim(),
          expiryDate: formData.expiryDate,
          notes: formData.notes,
        });

        if (res?.success) {
          toast.success(`Hosting plan "${formData.hostingName}" updated.`);
          setIsFormModalOpen(false);
          fetchData();
        } else {
          setFormError(res?.message || 'Failed to update hosting.');
        }
      } else {
        // Create hosting (POST /api/hosting)
        const res = await hostingApi.create({
          client: formData.client,
          hostingName: formData.hostingName.trim(),
          provider: formData.provider.trim(),
          hostname: formData.hostname.trim(),
          serverIp: formData.serverIp.trim(),
          expiryDate: formData.expiryDate,
          notes: formData.notes,
        });

        if (res?.success) {
          toast.success(`Hosting plan "${formData.hostingName}" added.`);
          setIsFormModalOpen(false);
          fetchData();
        } else {
          setFormError(res?.message || 'Failed to add hosting plan.');
        }
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to save hosting. Please check your data.');
      toast.error(err?.message || 'Failed to save hosting.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingHosting) return;
    setDeleteLoading(true);
    try {
      const res = await hostingApi.remove(deletingHosting._id);
      if (res?.success) {
        toast.success(`Hosting record "${deletingHosting.hostingName}" deleted.`);
        setDeletingHosting(null);
        fetchData();
      } else {
        toast.error(res?.message || 'Failed to delete hosting.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to delete hosting.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-12">
      {/* Header Card */}
      <div className="flex flex-col gap-4 rounded-[20px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_14px_rgba(20,30,40,0.035)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EFF6FF] text-[#3B82F6]">
            <Server size={19} strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#182028]">
              Hosting & Servers
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#8F999F]">
              Monitor web hosting packages, dedicated servers, VPS nodes and renewal schedules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F999F]"
            />
            <input
              type="text"
              placeholder="Search hosting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-[11px] border border-[#E9EDEF] bg-[#FAFBFB] pl-9 pr-3 text-xs text-[#182028] placeholder-[#8F999F] transition outline-none focus:border-[#18A968] focus:bg-white focus:ring-3 focus:ring-[#18A968]/15"
            />
          </div>

          <Button
            type="button"
            onClick={handleOpenCreate}
            className="shrink-0 min-h-[40px] text-xs gap-1.5"
          >
            <Plus size={15} />
            <span>Add Hosting</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-[20px] border border-[#E9EDEF] bg-white p-12">
          <Loader label="Loading hosting records..." />
        </div>
      ) : error ? (
        <div className="rounded-[20px] border border-[#E9EDEF] bg-white p-6">
          <ErrorMessage message={error} onRetry={fetchData} variant="card" />
        </div>
      ) : filteredHostings.length === 0 ? (
        <EmptyState
          icon={Server}
          title={searchQuery ? 'No matching hosting plans' : 'No hosting records yet'}
          description={
            searchQuery
              ? `No hosting plans found matching "${searchQuery}". Try a different query.`
              : 'Add your first hosting account or server node to track expiration and renew on time.'
          }
          actionText={searchQuery ? undefined : 'Add Your First Hosting Plan'}
          onAction={searchQuery ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHostings.map((hosting) => {
            const expiryStatus = getExpiryStatus(hosting.expiryDate);
            const clientName = hosting.client?.name || 'Unassigned';
            const clientCompany = hosting.client?.company;

            return (
              <div
                key={hosting._id}
                className="group flex flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]"
              >
                <div>
                  {/* Top row: Name, Provider & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EFF6FF] text-[#3B82F6]">
                        <Server size={16} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-[#182028]">
                          {hosting.hostingName}
                        </h3>
                        <p className="truncate text-[11.5px] text-[#8F999F]">
                          {hosting.provider || 'Web Hosting Provider'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(hosting)}
                        className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#EFF9F4] hover:text-[#168F5A]"
                        title="Edit Hosting"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingHosting(hosting)}
                        className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                        title="Delete Hosting"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${expiryStatus.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${expiryStatus.dotClass}`} />
                      {expiryStatus.statusLabel}
                    </span>

                    <span className="text-[11.5px] font-medium text-[#182028]">
                      {formatDate(hosting.expiryDate)}
                    </span>
                  </div>

                  {/* Technical & Client Details Card */}
                  <div className="mt-3.5 flex flex-col gap-2 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-3 text-xs text-[#525E6A]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building size={13} className="shrink-0 text-[#8F999F]" />
                      <span className="truncate font-medium text-[#182028]">
                        {clientName}
                      </span>
                      {clientCompany && (
                        <span className="truncate text-[#8F999F]">({clientCompany})</span>
                      )}
                    </div>

                    {(hosting.hostname || hosting.serverIp) && (
                      <div className="flex items-center gap-3 pt-1 border-t border-[#F0F3F5] text-[11.5px] text-[#64748B]">
                        {hosting.hostname && (
                          <div className="flex items-center gap-1 truncate">
                            <Cpu size={12} className="shrink-0 text-[#8F999F]" />
                            <span className="truncate">{hosting.hostname}</span>
                          </div>
                        )}
                        {hosting.serverIp && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Network size={12} className="text-[#8F999F]" />
                            <span>{hosting.serverIp}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {hosting.notes && (
                      <div className="flex items-start gap-2 pt-1 border-t border-[#F0F3F5] text-[11px] text-[#78838E]">
                        <FileText size={12} className="shrink-0 mt-0.5 text-[#8F999F]" />
                        <p className="line-clamp-2 leading-relaxed">{hosting.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 border-t border-[#F0F3F5] pt-3 flex items-center justify-between text-[11px] text-[#8F999F]">
                  <span>Added {formatDate(hosting.createdAt)}</span>
                  <span className="font-medium text-[#168F5A]">Server Online</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT HOSTING MODAL */}
      <Modal
        open={isFormModalOpen}
        onClose={() => !formSubmitting && setIsFormModalOpen(false)}
        title={editingHosting ? 'Edit Hosting Plan' : 'Add New Hosting'}
        description={
          editingHosting
            ? 'Update server specifications and renewal dates'
            : 'Enter server/hosting details and link to a client profile'
        }
      >
        {formError && (
          <div className="mb-4">
            <ErrorMessage message={formError} />
          </div>
        )}

        <form id="hosting-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          {/* Client Select */}
          {!editingHosting && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#26313B]">
                Assigned Client <span className="text-[#D95353]">*</span>
              </label>
              {clients.length === 0 ? (
                <div className="rounded-[10px] border border-[#FDE047] bg-[#FEFCE8] p-3 text-xs text-[#A16207]">
                  No clients available. Please create a client profile first before adding hosting plans.
                </div>
              ) : (
                <select
                  required
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  disabled={formSubmitting}
                  className="h-11 w-full rounded-[10px] border border-[#E4E8EC] bg-white px-3 text-xs font-medium text-[#27313B] transition outline-none focus:border-[#18A968] focus:ring-4 focus:ring-[#18A968]/10"
                >
                  <option value="" disabled>
                    Select a client...
                  </option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <InputField
            label="Hosting / Server Name"
            name="hostingName"
            placeholder="e.g. Dedicated Cloud Server #04 / AWS EC2 Production"
            value={formData.hostingName}
            onChange={(e) => setFormData({ ...formData, hostingName: e.target.value })}
            disabled={formSubmitting}
            required
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              label="Provider / Platform"
              name="provider"
              placeholder="e.g. DigitalOcean, AWS, Vercel"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              disabled={formSubmitting}
            />

            <InputField
              label="Hostname"
              name="hostname"
              placeholder="e.g. srv-prod-01.us-east"
              value={formData.hostname}
              onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
              disabled={formSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              label="Server IP"
              name="serverIp"
              placeholder="e.g. 192.241.142.88"
              value={formData.serverIp}
              onChange={(e) => setFormData({ ...formData, serverIp: e.target.value })}
              disabled={formSubmitting}
            />

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#26313B]">
                Expiry Date <span className="text-[#D95353]">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                disabled={formSubmitting}
                className="h-11 w-full cursor-pointer rounded-[10px] border border-[#E4E8EC] bg-white px-3 text-xs font-medium text-[#27313B] transition outline-none focus:border-[#18A968] focus:ring-4 focus:ring-[#18A968]/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#26313B]">
              Notes / Remarks
            </label>
            <textarea
              rows={3}
              placeholder="SSH port, cPanel login notes, RAM/CPU tier, backup schedule..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={formSubmitting}
              className="w-full resize-none rounded-[10px] border border-[#E4E8EC] bg-white p-3 text-xs text-[#27313B] placeholder-[#9AA3AD] transition outline-none focus:border-[#18A968] focus:ring-4 focus:ring-[#18A968]/10"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-[#F0F3F5] pt-4">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsFormModalOpen(false)}
              className="cursor-pointer rounded-[10px] border border-[#E9EDEF] bg-white px-4 py-2 text-xs font-semibold text-[#4B5563] transition hover:bg-[#F5F6F8] hover:text-[#182028] disabled:opacity-50"
            >
              Cancel
            </button>

            <Button
              type="submit"
              disabled={formSubmitting || (!editingHosting && clients.length === 0)}
              className="min-h-[40px] text-xs gap-1.5"
            >
              {formSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : editingHosting ? (
                'Save Changes'
              ) : (
                'Create Hosting Plan'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={Boolean(deletingHosting)}
        onClose={() => !deleteLoading && setDeletingHosting(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Hosting Plan"
        message={`Are you sure you want to delete "${deletingHosting?.hostingName}"? This action cannot be undone.`}
        confirmText="Delete Hosting"
        loading={deleteLoading}
      />
    </div>
  );
}
