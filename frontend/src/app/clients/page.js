'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  Edit3,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react';
import clientsApi from '@/api/clients.api';
import { useToast } from '@/components/common/ToastProvider';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import InputField from '@/components/common/InputField';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import EmptyState from '@/components/common/EmptyState';
import ErrorMessage from '@/components/common/ErrorMessage';
import { formatDate } from '@/utils/date.utils';

export default function ClientsPage() {
  const toast = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Form State (Create / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirm State
  const [deletingClient, setDeletingClient] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch clients from real backend API
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientsApi.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setClients(res.data);
      } else {
        setClients([]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load clients. Please try again.');
      toast.error('Failed to load clients.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      notes: '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      notes: client.notes || '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Submit Form (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Client name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingClient) {
        // Update client (PUT /api/clients/:id)
        const res = await clientsApi.update(editingClient._id, formData);
        if (res?.success) {
          toast.success(`Client "${formData.name}" updated successfully.`);
          setIsFormModalOpen(false);
          fetchClients();
        } else {
          setFormError(res?.message || 'Failed to update client.');
        }
      } else {
        // Create client (POST /api/clients)
        const res = await clientsApi.create(formData);
        if (res?.success) {
          toast.success(`Client "${formData.name}" added successfully.`);
          setIsFormModalOpen(false);
          fetchClients();
        } else {
          setFormError(res?.message || 'Failed to add client.');
        }
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to save client. Please check your data.');
      toast.error(err?.message || 'Failed to save client.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingClient) return;
    setDeleteLoading(true);
    try {
      const res = await clientsApi.remove(deletingClient._id);
      if (res?.success) {
        toast.success(`Client "${deletingClient.name}" deleted.`);
        setDeletingClient(null);
        fetchClients();
      } else {
        toast.error(res?.message || 'Failed to delete client.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to delete client.');
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
            <Users size={19} strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#182028]">
              Clients
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#8F999F]">
              Manage your client profiles, contact information and linked accounts
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
              placeholder="Search clients..."
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
            <span>Add Client</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-[20px] border border-[#E9EDEF] bg-white p-12">
          <Loader label="Loading client portfolio..." />
        </div>
      ) : error ? (
        <div className="rounded-[20px] border border-[#E9EDEF] bg-white p-6">
          <ErrorMessage message={error} onRetry={fetchClients} variant="card" />
        </div>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No matching clients' : 'No clients added yet'}
          description={
            searchQuery
              ? `No clients found matching "${searchQuery}". Try a different search.`
              : 'Add your first client to start tracking their domains, hostings, and renewal reminders.'
          }
          actionText={searchQuery ? undefined : 'Add Your First Client'}
          onAction={searchQuery ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            return (
              <div
                key={client._id}
                className="group flex flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]"
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EFF9F4] text-[#168F5A]">
                        <Building size={16} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-[#182028]">
                          {client.name}
                        </h3>
                        {client.company && (
                          <p className="truncate text-[11.5px] text-[#8F999F]">
                            {client.company}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(client)}
                        className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#EFF9F4] hover:text-[#168F5A]"
                        title="Edit Client"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingClient(client)}
                        className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                        title="Delete Client"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-3 text-xs text-[#525E6A]">
                    {client.email ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={13} className="shrink-0 text-[#8F999F]" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#A0A8AD]">
                        <Mail size={13} className="shrink-0" />
                        <span>No email provided</span>
                      </div>
                    )}

                    {client.phone ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone size={13} className="shrink-0 text-[#8F999F]" />
                        <span>{client.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#A0A8AD]">
                        <Phone size={13} className="shrink-0" />
                        <span>No phone provided</span>
                      </div>
                    )}

                    {client.notes && (
                      <div className="flex items-start gap-2 pt-1 border-t border-[#F0F3F5] text-[11px] text-[#78838E]">
                        <FileText size={12} className="shrink-0 mt-0.5 text-[#8F999F]" />
                        <p className="line-clamp-2 leading-relaxed">{client.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer info */}
                <div className="mt-4 border-t border-[#F0F3F5] pt-3 flex items-center justify-between text-[11px] text-[#8F999F]">
                  <span>Added {formatDate(client.createdAt)}</span>
                  <span className="font-medium text-[#168F5A]">Active Client</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CLIENT MODAL */}
      <Modal
        open={isFormModalOpen}
        onClose={() => !formSubmitting && setIsFormModalOpen(false)}
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        description={
          editingClient
            ? 'Update contact and company details for this client profile'
            : 'Fill in the client details to track their assigned domains and hostings'
        }
      >
        {formError && (
          <div className="mb-4">
            <ErrorMessage message={formError} />
          </div>
        )}

        <form id="client-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <InputField
            label="Client / Contact Name"
            name="name"
            placeholder="e.g. Alex Smith / Acme Corp"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={formSubmitting}
            required
          />

          <InputField
            label="Company Name"
            name="company"
            placeholder="e.g. Acme Technologies Ltd"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            disabled={formSubmitting}
          />

          <InputField
            label="Email Address"
            name="email"
            type="email"
            placeholder="e.g. contact@arccompany.io"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={formSubmitting}
          />

          <InputField
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="e.g. +1 (555) 234-8901"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={formSubmitting}
          />

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#26313B]">
              Notes / Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Internal remarks, billing cycle preferences, or contact notes..."
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
              disabled={formSubmitting}
              className="min-h-[40px] text-xs gap-1.5"
            >
              {formSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : editingClient ? (
                'Save Changes'
              ) : (
                'Create Client'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={Boolean(deletingClient)}
        onClose={() => !deleteLoading && setDeletingClient(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Client"
        message={`Are you sure you want to delete "${deletingClient?.name}"? This action cannot be undone.`}
        confirmText="Delete Client"
        loading={deleteLoading}
      />
    </div>
  );
}
