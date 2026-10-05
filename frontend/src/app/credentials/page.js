'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  Building,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Trash2,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';
import credentialsApi from '@/api/credentials.api';
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

export default function CredentialsPage() {
  const toast = useToast();

  const [credentials, setCredentials] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Revealed passwords state: { [credentialId]: decryptedPasswordString }
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [loadingPasswordId, setLoadingPasswordId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Modal Form State (Create / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [formData, setFormData] = useState({
    client: '',
    name: '',
    username: '',
    password: '',
    url: '',
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirm State
  const [deletingCredential, setDeletingCredential] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch credentials and clients
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [credsRes, clientsRes] = await Promise.all([
        credentialsApi.getAll(),
        clientsApi.getAll(),
      ]);

      if (credsRes?.success && Array.isArray(credsRes.data)) {
        setCredentials(credsRes.data);
      } else {
        setCredentials([]);
      }

      if (clientsRes?.success && Array.isArray(clientsRes.data)) {
        setClients(clientsRes.data);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load credentials. Please try again.');
      toast.error('Failed to load credentials.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter credentials by search query
  const filteredCredentials = useMemo(() => {
    if (!searchQuery.trim()) return credentials;
    const q = searchQuery.toLowerCase();
    return credentials.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.url?.toLowerCase().includes(q) ||
        c.client?.name?.toLowerCase().includes(q) ||
        c.client?.company?.toLowerCase().includes(q)
    );
  }, [credentials, searchQuery]);

  // Toggle Password Reveal via secure GET /api/credentials/:id
  const handleTogglePassword = async (credentialId) => {
    if (revealedPasswords[credentialId]) {
      // Hide
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[credentialId];
        return next;
      });
      return;
    }

    setLoadingPasswordId(credentialId);
    try {
      const res = await credentialsApi.getOne(credentialId);
      if (res?.success && res.data?.password) {
        setRevealedPasswords((prev) => ({
          ...prev,
          [credentialId]: res.data.password,
        }));
      } else {
        toast.info('No password stored for this credential.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to decrypt password.');
    } finally {
      setLoadingPasswordId(null);
    }
  };

  // Copy password to clipboard
  const handleCopyPassword = async (credentialId, password) => {
    try {
      let pwd = password;
      if (!pwd) {
        const res = await credentialsApi.getOne(credentialId);
        pwd = res?.data?.password;
      }
      if (pwd) {
        await navigator.clipboard.writeText(pwd);
        setCopiedId(credentialId);
        toast.success('Password copied to clipboard.');
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      toast.error('Could not copy password to clipboard.');
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCredential(null);
    setFormData({
      client: clients[0]?._id || '',
      name: '',
      username: '',
      password: '',
      url: '',
      notes: '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = async (cred) => {
    setEditingCredential(cred);
    setFormData({
      client: typeof cred.client === 'object' ? cred.client?._id : cred.client || '',
      name: cred.name || '',
      username: cred.username || '',
      password: '', // leave blank to keep unchanged
      url: cred.url || '',
      notes: cred.notes || '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Submit Form (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Account/Service name is required.');
      return;
    }

    if (!editingCredential && !formData.client) {
      setFormError('Please select a client for this credential.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingCredential) {
        // Update credential (PUT /api/credentials/:id)
        const payload = {
          name: formData.name.trim(),
          username: formData.username.trim(),
          url: formData.url.trim(),
          notes: formData.notes,
        };
        if (formData.password) {
          payload.password = formData.password;
        }

        const res = await credentialsApi.update(editingCredential._id, payload);
        if (res?.success) {
          toast.success(`Credential "${formData.name}" updated successfully.`);
          setIsFormModalOpen(false);
          // Invalidate cached revealed password
          setRevealedPasswords((prev) => {
            const next = { ...prev };
            delete next[editingCredential._id];
            return next;
          });
          fetchData();
        } else {
          setFormError(res?.message || 'Failed to update credential.');
        }
      } else {
        // Create credential (POST /api/credentials)
        const res = await credentialsApi.create({
          client: formData.client,
          name: formData.name.trim(),
          username: formData.username.trim(),
          password: formData.password || undefined,
          url: formData.url.trim(),
          notes: formData.notes,
        });

        if (res?.success) {
          toast.success(`Credential "${formData.name}" stored securely.`);
          setIsFormModalOpen(false);
          fetchData();
        } else {
          setFormError(res?.message || 'Failed to save credential.');
        }
      }
    } catch (err) {
      setFormError(err?.message || 'Failed to save credential.');
      toast.error(err?.message || 'Failed to save credential.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingCredential) return;
    setDeleteLoading(true);
    try {
      const res = await credentialsApi.remove(deletingCredential._id);
      if (res?.success) {
        toast.success(`Credential "${deletingCredential.name}" deleted.`);
        setDeletingCredential(null);
        fetchData();
      } else {
        toast.error(res?.message || 'Failed to delete credential.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to delete credential.');
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
            <KeyRound size={19} strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-[#182028]">
              Credentials Vault
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#8F999F]">
              Encrypted password vault for client server logins, control panels, and accounts
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
              placeholder="Search credentials..."
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
            <span>Add Credential</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-[20px] border border-[#E9EDEF] bg-white p-12">
          <Loader label="Loading encrypted credentials vault..." />
        </div>
      ) : error ? (
        <div className="rounded-[20px] border border-[#E9EDEF] bg-white p-6">
          <ErrorMessage message={error} onRetry={fetchData} variant="card" />
        </div>
      ) : filteredCredentials.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={searchQuery ? 'No matching credentials' : 'No credentials stored yet'}
          description={
            searchQuery
              ? `No credentials found matching "${searchQuery}". Try another search term.`
              : 'Store encrypted cPanel, SSH, database, and admin credentials linked to clients.'
          }
          actionText={searchQuery ? undefined : 'Add Your First Credential'}
          onAction={searchQuery ? undefined : handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCredentials.map((cred) => {
            const isRevealed = Boolean(revealedPasswords[cred._id]);
            const isFetchingPassword = loadingPasswordId === cred._id;
            const clientName = cred.client?.name || 'Unassigned';
            const clientCompany = cred.client?.company;

            return (
              <div
                key={cred._id}
                className="group flex flex-col justify-between rounded-[18px] border border-[#E9EDEF] bg-white p-5 shadow-[0_2px_12px_rgba(20,30,40,0.03)] transition-all duration-200 hover:border-[#D3D9DE] hover:shadow-[0_6px_20px_rgba(20,30,40,0.05)]"
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EFF9F4] text-[#168F5A]">
                        <Lock size={16} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-[#182028]">
                          {cred.name}
                        </h3>
                        {cred.url ? (
                          <a
                            href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11.5px] text-[#168F5A] hover:underline"
                          >
                            <span className="truncate">{cred.url}</span>
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
                        ) : (
                          <p className="text-[11.5px] text-[#8F999F]">Internal Access</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cred)}
                        className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#EFF9F4] hover:text-[#168F5A]"
                        title="Edit Credential"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingCredential(cred)}
                        className="cursor-pointer rounded-lg p-1.5 text-[#8F999F] transition hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                        title="Delete Credential"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Username & Password Vault Box */}
                  <div className="mt-3.5 flex flex-col gap-2 rounded-xl border border-[#F0F3F5] bg-[#FAFBFB] p-3 text-xs">
                    {/* Username */}
                    <div className="flex items-center justify-between text-[#525E6A]">
                      <span className="text-[#8F999F]">Username:</span>
                      <span className="font-semibold text-[#182028] truncate max-w-[170px]">
                        {cred.username || '—'}
                      </span>
                    </div>

                    {/* Password field with Secure Reveal & Copy */}
                    <div className="flex items-center justify-between border-t border-[#F0F3F5] pt-2 text-[#525E6A]">
                      <span className="text-[#8F999F]">Password:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[#182028]">
                          {isRevealed
                            ? revealedPasswords[cred._id]
                            : '••••••••••••'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleTogglePassword(cred._id)}
                          disabled={isFetchingPassword}
                          className="cursor-pointer rounded p-1 text-[#8F999F] transition hover:bg-white hover:text-[#168F5A]"
                          title={isRevealed ? 'Hide password' : 'Show decrypted password'}
                        >
                          {isFetchingPassword ? (
                            <Loader2 size={13} className="animate-spin text-[#168F5A]" />
                          ) : isRevealed ? (
                            <EyeOff size={13} />
                          ) : (
                            <Eye size={13} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyPassword(cred._id, revealedPasswords[cred._id])}
                          className="cursor-pointer rounded p-1 text-[#8F999F] transition hover:bg-white hover:text-[#168F5A]"
                          title="Copy password"
                        >
                          {copiedId === cred._id ? (
                            <Check size={13} className="text-[#18A968]" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    {cred.notes && (
                      <div className="flex items-start gap-2 pt-1.5 border-t border-[#F0F3F5] text-[11px] text-[#78838E]">
                        <FileText size={12} className="shrink-0 mt-0.5 text-[#8F999F]" />
                        <p className="line-clamp-2 leading-relaxed">{cred.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Client Info */}
                <div className="mt-4 border-t border-[#F0F3F5] pt-3 flex items-center justify-between text-[11px] text-[#8F999F]">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building size={12} className="shrink-0" />
                    <span className="truncate font-medium text-[#182028]">{clientName}</span>
                    {clientCompany && <span className="truncate">({clientCompany})</span>}
                  </div>
                  <span className="shrink-0 text-[#168F5A] font-medium">Encrypted</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CREDENTIAL MODAL */}
      <Modal
        open={isFormModalOpen}
        onClose={() => !formSubmitting && setIsFormModalOpen(false)}
        title={editingCredential ? 'Edit Credential' : 'Add New Credential'}
        description={
          editingCredential
            ? 'Update access credentials (passwords are re-encrypted automatically)'
            : 'Store server, panel, or application credentials securely'
        }
      >
        {formError && (
          <div className="mb-4">
            <ErrorMessage message={formError} />
          </div>
        )}

        <form id="credential-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          {/* Client Select */}
          {!editingCredential && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#26313B]">
                Assigned Client <span className="text-[#D95353]">*</span>
              </label>
              {clients.length === 0 ? (
                <div className="rounded-[10px] border border-[#FDE047] bg-[#FEFCE8] p-3 text-xs text-[#A16207]">
                  No clients available. Please create a client profile first before saving credentials.
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
            label="Service / Account Name"
            name="name"
            placeholder="e.g. Production cPanel / AWS Console / DB Root"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={formSubmitting}
            required
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              label="Username / Login"
              name="username"
              placeholder="e.g. admin_user / root"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={formSubmitting}
            />

            <InputField
              label={editingCredential ? 'New Password (leave blank to keep)' : 'Password'}
              name="password"
              type="password"
              placeholder={editingCredential ? '••••••••' : 'Enter password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={formSubmitting}
            />
          </div>

          <InputField
            label="Login URL / Endpoint"
            name="url"
            placeholder="e.g. https://cpanel.clientdomain.com:2083"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            disabled={formSubmitting}
          />

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#26313B]">
              Notes / Special Instructions
            </label>
            <textarea
              rows={3}
              placeholder="2FA recovery codes, port numbers, SSH key path..."
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
              disabled={formSubmitting || (!editingCredential && clients.length === 0)}
              className="min-h-[40px] text-xs gap-1.5"
            >
              {formSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : editingCredential ? (
                'Save Changes'
              ) : (
                'Save Credential'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={Boolean(deletingCredential)}
        onClose={() => !deleteLoading && setDeletingCredential(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Credential"
        message={`Are you sure you want to delete "${deletingCredential?.name}"? This password cannot be recovered.`}
        confirmText="Delete Credential"
        loading={deleteLoading}
      />
    </div>
  );
}
