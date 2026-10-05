'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe,
  Plus,
  Search,
  Building,
  Calendar,
  Edit3,
  Trash2,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import domainsApi from '@/api/domains.api';
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

export default function DomainsPage() {
  const toast = useToast();

  const [domains, setDomains] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Form State (Create / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [formData, setFormData] = useState({
    client: '',
    domainName: '',
    registrar: '',
    expiryDate: '',
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirm State
  const [deletingDomain, setDeletingDomain] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch domains & clients from real backend API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [domainsRes, clientsRes] = await Promise.all([
        domainsApi.getAll(),
        clientsApi.getAll(),
      ]);

      if (domainsRes?.success && Array.isArray(domainsRes.data)) {
        setDomains(domainsRes.data);
      } else {
        setDomains([]);
      }

      if (clientsRes?.success && Array.isArray(clientsRes.data)) {
        setClients(clientsRes.data);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load domains. Please try again.');
      toast.error('Failed to load domains.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter domains by search query
  const filteredDomains = useMemo(() => {
    if (!searchQuery.trim()) return domains;
    const q = searchQuery.toLowerCase();
    return domains.filter(
      (d) =>
        d.domainName?.toLowerCase().includes(q) ||
        d.registrar?.toLowerCase().includes(q) ||
        d.client?.name?.toLowerCase().includes(q) ||
        d.client?.company?.toLowerCase().includes(q)
    );
  }, [domains, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingDomain(null);
    setFormData({
      client: clients[0]?._id || '',
      domainName: '',
      registrar: '',
      expiryDate: '',
      notes: '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (domain) => {
    setEditingDomain(domain);
    const dateFormatted = domain.expiryDate
      ? new Date(domain.expiryDate).toISOString().split('T')[0]
      : '';

    setFormData({
      client: typeof domain.client === 'object' ? domain.client?._id : domain.client || '',
      domainName: domain.domainName || '',
      registrar: domain.registrar || '',
      expiryDate: dateFormatted,
      notes: domain.notes || '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Submit Form (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.domainName.trim()) {
      setFormError('Domain name is required.');
      return;
    }

    if (!editingDomain && !formData.client) {
      setFormError('Please select a client for this domain.');
      return;
    }

    if (!formData.expiryDate) {
      setFormError('Expiry date is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingDomain) {
        // Update domain (PUT /api/domains/:id)
        const res = await domainsApi.update(editingDomain._id, {
          domainName: formData.domainName.trim(),
          registrar: formData.registrar.trim(),
          expiryDate: formData.expiryDate,
          notes: formData.notes,
        });

        if (res?.success) {
          toast.success(`Domain "${formData.domainName}" updated successfully.`);
          setIsFormModalOpen(false);
          fetchData();
        } else {
          setFormError(res?.message || 'Failed to update domain.');
        }
      } else {
        // Create domain (POST /api/domains)
        const res = await domainsApi.create({
          client: formData.client,
          domainName: formData.domainName.trim(),
          registrar: formData.registrar.trim(),
          expiryDate: formData.expiryDate,
          notes: formData.notes,
        });

        if (res?.success) {
          toast.success(`Domain "${formData.domainName}" added successfully.`);
          setIsFormModalOpen(false);
          fetchData();
        } else {
          setFormError(res?.message || 'Failed to add domain.');
        }
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to save domain. Please check your data.');
      toast.error(err?.message || 'Failed to save domain.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingDomain) return;
    setDeleteLoading(true);
    try {
      const res = await domainsApi.remove(deletingDomain._id);
      if (res?.success) {
        toast.success(`Domain "${deletingDomain.domainName}" deleted.`);
        setDeletingDomain(null);
        fetchData();
      } else {
        toast.error(res?.message || 'Failed to delete domain.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to delete domain.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-12">
      {/* Header Card */}
      <div className="flex flex-col gap-4 rounded-[20px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_14px_rgba(20,30,40,0.035)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EFF9F4] text-[#168F5A]">
            <Globe size={19} strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#182028]">
              Domains
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#8F999F]">
              Track registered domains, expiration dates, registrars and client ownership
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
              placeholder="Search domains..."
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
            <span>Add Domain</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-[20px] border border-[#E9EDEF] bg-white p-12">
          <Loader label="Loading domains portfolio..." />
        </div>
      ) : error ? (
        <div className="rounded-[20px] border border-[#E9EDEF] bg-white p-6">
          <ErrorMessage message={error} onRetry={fetchData} variant="card" />
        </div>
      ) : filteredDomains.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={searchQuery ? 'No matching domains' : 'No domains registered yet'}
          description={
            searchQuery
              ? `No domains found matching "${searchQuery}". Try a different search.`
              : 'Add your first domain to monitor expiration dates and receive automated reminders.'
          }
          actionText={searchQuery ? undefined : 'Add Your First Domain'}
          onAction={searchQuery ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDomains.map((domain) => {
            const expiryStatus = getExpiryStatus(domain.expiryDate);
            const clientName = domain.client?.name || 'Unassigned';
            const clientCompany = domain.client?.company;

            return (
              <div
                key={domain._id}
                className="group flex flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]"
              >
                <div>
                  {/* Top row: Name, Status & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EFF9F4] text-[#168F5A]">
                        <Globe size={16} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-[#182028]">
                          {domain.domainName}
                        </h3>
                        <p className="truncate text-[11.5px] text-[#8F999F]">
                          {domain.registrar || 'Standard Registrar'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(domain)}
                        className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#EFF9F4] hover:text-[#168F5A]"
                        title="Edit Domain"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingDomain(domain)}
                        className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                        title="Delete Domain"
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
                      {formatDate(domain.expiryDate)}
                    </span>
                  </div>

                  {/* Client and Notes Card */}
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

                    {domain.notes && (
                      <div className="flex items-start gap-2 pt-1 border-t border-[#F0F3F5] text-[11px] text-[#78838E]">
                        <FileText size={12} className="shrink-0 mt-0.5 text-[#8F999F]" />
                        <p className="line-clamp-2 leading-relaxed">{domain.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 border-t border-[#F0F3F5] pt-3 flex items-center justify-between text-[11px] text-[#8F999F]">
                  <span>Added {formatDate(domain.createdAt)}</span>
                  <span className="font-medium text-[#168F5A]">Domain Active</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT DOMAIN MODAL */}
      <Modal
        open={isFormModalOpen}
        onClose={() => !formSubmitting && setIsFormModalOpen(false)}
        title={editingDomain ? 'Edit Domain' : 'Add New Domain'}
        description={
          editingDomain
            ? 'Update domain registration and expiry information'
            : 'Enter domain details and assign to a client profile'
        }
      >
        {formError && (
          <div className="mb-4">
            <ErrorMessage message={formError} />
          </div>
        )}

        <form id="domain-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          {/* Client Select */}
          {!editingDomain && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#26313B]">
                Assigned Client <span className="text-[#D95353]">*</span>
              </label>
              {clients.length === 0 ? (
                <div className="rounded-[10px] border border-[#FDE047] bg-[#FEFCE8] p-3 text-xs text-[#A16207]">
                  No clients available. Please create a client profile first before assigning domains.
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
            label="Domain Name"
            name="domainName"
            placeholder="e.g. yourclientdomain.com"
            value={formData.domainName}
            onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
            disabled={formSubmitting}
            required
          />

          <InputField
            label="Registrar"
            name="registrar"
            placeholder="e.g. Namecheap, Cloudflare, GoDaddy"
            value={formData.registrar}
            onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
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

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#26313B]">
              Notes / Remarks
            </label>
            <textarea
              rows={3}
              placeholder="DNS records, auto-renew notes, nameservers..."
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
              disabled={formSubmitting || (!editingDomain && clients.length === 0)}
              className="min-h-[40px] text-xs gap-1.5"
            >
              {formSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : editingDomain ? (
                'Save Changes'
              ) : (
                'Create Domain'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={Boolean(deletingDomain)}
        onClose={() => !deleteLoading && setDeletingDomain(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Domain"
        message={`Are you sure you want to delete "${deletingDomain?.domainName}"? This action cannot be undone.`}
        confirmText="Delete Domain"
        loading={deleteLoading}
      />
    </div>
  );
}
