import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import couponService from '../../services/couponService';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';
import ViewDetailsModal from '../../components/common/ViewDetailsModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const emptyCatalogForm = {
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  targetType: 'selected',
  applicableServices: [],
  endDate: '',
  isActive: true,
};

const emptySendForm = {
  title: '',
  description: '',
  code: '',
  discountType: 'percentage',
  discountValue: 15,
  validUntil: '',
  applicableServices: [],
  userIds: [],
  perUserLimit: 1,
};

const emptyCouponForm = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: '',
  usageLimit: '',
  perUserLimit: 1,
  validUntil: '',
  isActive: true,
  applicableServices: [],
};

const emptyLoyaltyForm = {
  title: '',
  description: '',
  pointsCost: 100,
  discountType: 'percentage',
  discountValue: 10,
  maxDiscountAmount: '',
  applicableServices: [],
  usageLimit: '',
  perUserLimit: 1,
  validUntil: '',
  isActive: true,
};

const PromotionsManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const staffTabs = user?.permissions?.tabs || [];
  const rawActions = user?.permissions?.actions || {};

  const TAB_PERMISSION_NAMES = {
    catalog: 'Catalog Discounts',
    loyalty: 'Loyalty Redeem',
    send: 'Send Coupons',
    coupons: 'Coupon History',
    history: 'Redeem History',
  };

  const TAB_URLS = {
    catalog: '/admin/promotions',
    loyalty: '/admin/promotions?tab=loyalty',
    send: '/admin/promotions?tab=send',
    coupons: '/admin/promotions?tab=coupons',
    history: '/admin/promotions?tab=history',
  };

  const getTabFromUrl = () => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'loyalty') return 'loyalty';
    if (tab === 'send') return 'send';
    if (tab === 'coupons') return 'coupons';
    if (tab === 'history') return 'history';
    return 'catalog';
  };

  const hasTabAccess = (permissionName) =>
    isAdmin || staffTabs.includes(permissionName) || staffTabs.includes('Promotions');

  const [tab, setTab] = useState(getTabFromUrl);
  const activeTabName = TAB_PERMISSION_NAMES[tab] || 'Catalog Discounts';
  const hasAccessToActiveTab = hasTabAccess(activeTabName);

  const currentTabActions = Array.isArray(rawActions)
    ? rawActions
    : rawActions[activeTabName] || rawActions.Promotions || [];

  const canAdd = isAdmin || currentTabActions.includes('Add');
  const canEdit = isAdmin || currentTabActions.includes('Edit');
  const canDelete = isAdmin || currentTabActions.includes('Delete');
  const canView = isAdmin || currentTabActions.includes('View');
  const canSend = isAdmin || currentTabActions.includes('Send');

  const [promotions, setPromotions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loyaltyOffers, setLoyaltyOffers] = useState([]);
  const [couponHistory, setCouponHistory] = useState([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState(emptyCatalogForm);
  const [sendForm, setSendForm] = useState(emptySendForm);
  const [customerSearch, setCustomerSearch] = useState('');

  const [selectedPromo, setSelectedPromo] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponEditId, setCouponEditId] = useState(null);
  const [couponForm, setCouponForm] = useState(emptyCouponForm);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [loyaltyEditMode, setLoyaltyEditMode] = useState(false);
  const [loyaltyEditId, setLoyaltyEditId] = useState(null);
  const [loyaltyForm, setLoyaltyForm] = useState(emptyLoyaltyForm);
  const [savingLoyalty, setSavingLoyalty] = useState(false);
  const { showAlert, showConfirm } = useAlertStore();

  useEffect(() => {
    const nextTab = getTabFromUrl();
    setTab(nextTab);

    // Redirect staff to first allowed promotions sub-tab if current one is blocked
    if (!isAdmin) {
      const allowedKeys = Object.entries(TAB_PERMISSION_NAMES)
        .filter(([, name]) => hasTabAccess(name))
        .map(([key]) => key);
      if (allowedKeys.length && !hasTabAccess(TAB_PERMISSION_NAMES[nextTab])) {
        navigate(TAB_URLS[allowedKeys[0]], { replace: true });
      }
    }
  }, [location.search, isAdmin]);

  const catalogPromos = useMemo(
    () => promotions.filter((p) => p.promoType !== 'coupon'),
    [promotions]
  );
  const couponPromos = useMemo(
    () => promotions.filter((p) => p.promoType === 'coupon'),
    [promotions]
  );

  const regularServices = services.filter((s) => !s.isConsultation);
  const consultationServices = services.filter((s) => s.isConsultation);

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [promoRes, serviceRes, customerRes, couponRes, loyaltyRes, historyRes] =
        await Promise.all([
          api.get('/admin/promotions'),
          api.get('/admin/services'),
          api.get('/admin/customers?limit=200'),
          couponService.getAllCoupons({ limit: 50 }).catch(() => ({ data: { data: [] } })),
          api.get('/admin/loyalty-offers').catch(() => ({ data: { data: [] } })),
          api.get('/admin/promotions/redeem-history?limit=50').catch(() => ({
            data: { data: { couponHistory: [], loyaltyHistory: [] } },
          })),
        ]);
      setPromotions(promoRes.data.data || []);
      setServices(serviceRes.data.data || []);
      setCustomers(customerRes.data.data || []);
      setCoupons(couponRes.data.data || []);
      setLoyaltyOffers(loyaltyRes.data.data || []);
      setCouponHistory(historyRes.data?.data?.couponHistory || []);
      setLoyaltyHistory(historyRes.data?.data?.loyaltyHistory || []);
    } catch {
      showAlert('error', 'Error', 'Failed to load promotions data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCatalogChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleServiceInForm = (id, formKey = 'catalog') => {
    const setter = formKey === 'send' ? setSendForm : setFormData;
    setter((prev) => {
      const list = prev.applicableServices || [];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, applicableServices: next };
    });
  };

  const toggleUser = (id) => {
    setSendForm((prev) => {
      const list = prev.userIds || [];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, userIds: next };
    });
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData(emptyCatalogForm);
    setIsModalOpen(true);
  };

  const openEditModal = (promo) => {
    setIsEditMode(true);
    setCurrentId(promo._id);
    setFormData({
      title: promo.title,
      description: promo.description || '',
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      targetType: promo.targetType || 'selected',
      applicableServices: (promo.applicableServices || []).map((s) => s._id || s),
      endDate: new Date(promo.endDate).toISOString().split('T')[0],
      isActive: promo.isActive,
    });
    setIsModalOpen(true);
  };

  const handleCatalogSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        promoType: 'catalog',
        discountValue: Number(formData.discountValue),
      };
      if (isEditMode) {
        await api.put(`/admin/promotions/${currentId}`, payload);
        showAlert('success', 'Updated', 'Catalog promotion updated and prices refreshed.');
      } else {
        await api.post('/admin/promotions', payload);
        showAlert('success', 'Created', 'Promotion applied to selected services/consultations.');
      }
      setIsModalOpen(false);
      fetchAll();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Action failed');
    }
  };

  const handleSendCoupons = async (e) => {
    e.preventDefault();
    if (!sendForm.userIds.length) {
      showAlert('error', 'Select customers', 'Choose at least one customer to receive the coupon.');
      return;
    }
    try {
      setSending(true);
      const res = await api.post('/admin/promotions/send-coupons', {
        ...sendForm,
        discountValue: Number(sendForm.discountValue),
        perUserLimit: Number(sendForm.perUserLimit) || 1,
        code: sendForm.code || undefined,
      });
      showAlert(
        'success',
        'Coupons sent',
        res.data.message || `Offer sent to ${sendForm.userIds.length} customer(s).`
      );
      setSendForm(emptySendForm);
      navigate('/admin/promotions?tab=coupons');
      fetchAll();
    } catch (error) {
      showAlert('error', 'Send failed', error.response?.data?.message || 'Could not send coupons.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      'Delete Promotion',
      'Delete this promotion? Catalog discounts on linked services will be cleared.',
      async () => {
        try {
          await api.delete(`/admin/promotions/${id}`);
          showAlert('success', 'Deleted', 'Promotion removed.');
          fetchAll();
        } catch {
          showAlert('error', 'Error', 'Failed to delete promotion');
        }
      }
    );
  };

  const openEditCoupon = (coupon) => {
    setCouponEditId(coupon._id);
    setCouponForm({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue ?? 10,
      minOrderAmount: coupon.minOrderAmount ?? 0,
      maxDiscountAmount: coupon.maxDiscountAmount ?? '',
      usageLimit: coupon.usageLimit ?? '',
      perUserLimit: coupon.perUserLimit ?? 1,
      validUntil: coupon.validUntil
        ? new Date(coupon.validUntil).toISOString().split('T')[0]
        : '',
      isActive: coupon.isActive !== false,
      applicableServices: (coupon.applicableServices || []).map((s) => s._id || s),
    });
    setIsCouponModalOpen(true);
  };

  const handleCouponFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCouponForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'code' ? value.toUpperCase() : value,
    }));
  };

  const toggleCouponService = (id) => {
    setCouponForm((prev) => {
      const list = prev.applicableServices || [];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, applicableServices: next };
    });
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    if (!couponEditId) return;
    try {
      setSavingCoupon(true);
      const payload = {
        code: couponForm.code.trim(),
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        minOrderAmount: Number(couponForm.minOrderAmount) || 0,
        perUserLimit: Number(couponForm.perUserLimit) || 1,
        validUntil: couponForm.validUntil,
        isActive: couponForm.isActive,
        applicableServices: couponForm.applicableServices,
      };
      if (couponForm.maxDiscountAmount !== '' && couponForm.maxDiscountAmount != null) {
        payload.maxDiscountAmount = Number(couponForm.maxDiscountAmount);
      }
      if (couponForm.usageLimit !== '' && couponForm.usageLimit != null) {
        payload.usageLimit = Number(couponForm.usageLimit);
      } else {
        payload.usageLimit = null;
      }
      await couponService.updateCoupon(couponEditId, payload);
      showAlert('success', 'Updated', 'Coupon updated successfully.');
      setIsCouponModalOpen(false);
      setCouponEditId(null);
      fetchAll();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to update coupon');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = (coupon) => {
    showConfirm(
      'Delete Coupon',
      `Delete coupon ${coupon.code}? Customers will no longer be able to redeem it.`,
      async () => {
        try {
          await couponService.deleteCoupon(coupon._id);
          showAlert('success', 'Deleted', 'Coupon removed.');
          fetchAll();
        } catch (error) {
          showAlert('error', 'Error', error.response?.data?.message || 'Failed to delete coupon');
        }
      }
    );
  };

  const openAddLoyalty = () => {
    setLoyaltyEditMode(false);
    setLoyaltyEditId(null);
    setLoyaltyForm(emptyLoyaltyForm);
    setIsLoyaltyModalOpen(true);
  };

  const openEditLoyalty = (offer) => {
    setLoyaltyEditMode(true);
    setLoyaltyEditId(offer._id);
    setLoyaltyForm({
      title: offer.title || '',
      description: offer.description || '',
      pointsCost: offer.pointsCost ?? 100,
      discountType: offer.discountType || 'percentage',
      discountValue: offer.discountValue ?? 10,
      maxDiscountAmount: offer.maxDiscountAmount ?? '',
      applicableServices: (offer.applicableServices || []).map((s) => s._id || s),
      usageLimit: offer.usageLimit ?? '',
      perUserLimit: offer.perUserLimit ?? 1,
      validUntil: offer.validUntil
        ? new Date(offer.validUntil).toISOString().split('T')[0]
        : '',
      isActive: offer.isActive !== false,
    });
    setIsLoyaltyModalOpen(true);
  };

  const handleLoyaltyFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoyaltyForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleLoyaltyService = (id) => {
    setLoyaltyForm((prev) => {
      const list = prev.applicableServices || [];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, applicableServices: next };
    });
  };

  const handleLoyaltySubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingLoyalty(true);
      const payload = {
        title: loyaltyForm.title.trim(),
        description: loyaltyForm.description,
        pointsCost: Number(loyaltyForm.pointsCost),
        discountType: loyaltyForm.discountType,
        discountValue: Number(loyaltyForm.discountValue),
        applicableServices: loyaltyForm.applicableServices,
        perUserLimit: Number(loyaltyForm.perUserLimit) || 1,
        validUntil: loyaltyForm.validUntil,
        isActive: loyaltyForm.isActive,
      };
      if (loyaltyForm.maxDiscountAmount !== '' && loyaltyForm.maxDiscountAmount != null) {
        payload.maxDiscountAmount = Number(loyaltyForm.maxDiscountAmount);
      }
      if (loyaltyForm.usageLimit !== '' && loyaltyForm.usageLimit != null) {
        payload.usageLimit = Number(loyaltyForm.usageLimit);
      }

      if (loyaltyEditMode) {
        await api.put(`/admin/loyalty-offers/${loyaltyEditId}`, payload);
        showAlert('success', 'Updated', 'Loyalty redeem offer updated.');
      } else {
        await api.post('/admin/loyalty-offers', payload);
        showAlert('success', 'Created', 'Loyalty redeem offer created.');
      }
      setIsLoyaltyModalOpen(false);
      fetchAll();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to save loyalty offer');
    } finally {
      setSavingLoyalty(false);
    }
  };

  const handleDeleteLoyalty = (offer) => {
    showConfirm(
      'Delete Loyalty Offer',
      `Delete "${offer.title}"? Customers will no longer be able to redeem it with points.`,
      async () => {
        try {
          await api.delete(`/admin/loyalty-offers/${offer._id}`);
          showAlert('success', 'Deleted', 'Loyalty offer removed.');
          fetchAll();
        } catch (error) {
          showAlert('error', 'Error', error.response?.data?.message || 'Failed to delete offer');
        }
      }
    );
  };

  const discountLabel = (p) =>
    p.discountType === 'percentage' ? `${p.discountValue}%` : `LKR ${p.discountValue}`;

  const tabTitles = {
    catalog: 'Catalog Discounts',
    loyalty: 'Loyalty Redeem',
    send: 'Send Coupons',
    coupons: 'Coupon History',
    history: 'Redeem History',
  };

  if (loading) return <LoadingSpinner text="Loading promotions..." />;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Marketing</p>
          <h1 className="text-3xl font-serif text-secondary font-bold">
            {tabTitles[tab] || 'Promotions'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
            {tab === 'catalog' &&
              'Apply sale prices on services & consultations.'}
            {tab === 'loyalty' &&
              'Create point-based redeem offers customers can use at checkout.'}
            {tab === 'send' &&
              'Send redeemable coupon codes to selected customers by email and notification.'}
            {tab === 'coupons' &&
              'View and manage coupon campaigns and coupon codes.'}
            {tab === 'history' &&
              'See when customers used coupon codes or redeemed loyalty points.'}
          </p>
        </div>
        {hasAccessToActiveTab && tab === 'catalog' && canAdd && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-3 font-label-md"
          >
            <span className="material-symbols-outlined">add</span>
            Catalog Discount
          </button>
        )}
        {hasAccessToActiveTab && tab === 'loyalty' && canAdd && (
          <button
            type="button"
            onClick={openAddLoyalty}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-3 font-label-md"
          >
            <span className="material-symbols-outlined">add</span>
            Loyalty Redeem Offer
          </button>
        )}
      </div>

      {!hasAccessToActiveTab ? (
        <div className="bg-surface border border-outline-variant/50 luxury-shadow p-16 text-center text-gray-500 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-5xl mb-4 text-outline">lock</span>
          <p className="font-medium text-on-surface mb-1">Access denied</p>
          <p className="max-w-md mx-auto text-sm">
            You do not have permission to view the {activeTabName} tab.
          </p>
        </div>
      ) : (
        <>
      {tab === 'catalog' && (
        <div className="bg-surface border border-outline-variant/50 luxury-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Discount</th>
                  <th className="px-6 py-4 font-medium">Items</th>
                  <th className="px-6 py-4 font-medium">Until</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {catalogPromos.map((promo) => (
                  <tr key={promo._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {canView ? (
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium text-left"
                          onClick={() => {
                            setSelectedPromo(promo);
                            setIsViewModalOpen(true);
                          }}
                        >
                          {promo.title}
                        </button>
                      ) : (
                        promo.title
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm capitalize text-gray-600">
                      {(promo.targetType || 'selected').replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-primary">
                      {discountLabel(promo)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(promo.applicableServices || []).length} linked
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(promo.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          promo.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {promo.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit"
                            aria-label="Edit"
                            onClick={() => openEditModal(promo)}
                            className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete"
                            aria-label="Delete"
                            onClick={() => handleDelete(promo._id)}
                            className="inline-flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {catalogPromos.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                      No catalog promotions yet. Create one to show sale prices on services and
                      consultations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'loyalty' && (
        <div className="space-y-6">
          <div className="bg-surface border border-outline-variant/50 luxury-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/40">
              <h2 className="font-semibold">Loyalty point redeem offers</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Customers spend loyalty points to unlock these discounts at checkout.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Points cost</th>
                    <th className="px-6 py-3">Discount</th>
                    <th className="px-6 py-3">Used</th>
                    <th className="px-6 py-3">Until</th>
                    <th className="px-6 py-3">Status</th>
                    {(canEdit || canDelete) && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loyaltyOffers.map((offer) => (
                    <tr key={offer._id}>
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium">{offer.title}</p>
                        {offer.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {offer.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-primary">
                        {offer.pointsCost} pts
                      </td>
                      <td className="px-6 py-3 text-sm">{discountLabel(offer)}</td>
                      <td className="px-6 py-3 text-sm">
                        {offer.usedCount || 0}
                        {offer.usageLimit ? ` / ${offer.usageLimit}` : ''}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {new Date(offer.validUntil).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={
                            offer.isActive
                              ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 text-xs'
                              : 'text-gray-500 bg-gray-100 px-2 py-0.5 text-xs'
                          }
                        >
                          {offer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                title="Edit"
                                aria-label="Edit"
                                onClick={() => openEditLoyalty(offer)}
                                className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                title="Delete"
                                aria-label="Delete"
                                onClick={() => handleDeleteLoyalty(offer)}
                                className="inline-flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {loyaltyOffers.length === 0 && (
                    <tr>
                      <td
                        colSpan={canEdit || canDelete ? 7 : 6}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        No loyalty redeem offers yet. Create one so customers can spend points for
                        discounts.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'send' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form
            onSubmit={handleSendCoupons}
            className="bg-surface border border-outline-variant/50 luxury-shadow p-6 space-y-4"
          >
            <h2 className="font-title-md font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">forward_to_inbox</span>
              Send redeemable coupon
            </h2>
            {!canSend && (
              <p className="text-sm text-red-600">You do not have permission to send promotions.</p>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Offer title</label>
              <input
                required
                value={sendForm.title}
                onChange={(e) => setSendForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border border-outline-variant p-3"
                placeholder="Summer Glow 15% Off"
                disabled={!canSend}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                rows={3}
                value={sendForm.description}
                onChange={(e) => setSendForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-outline-variant p-3"
                placeholder="Enjoy this exclusive offer on your next visit."
                disabled={!canSend}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Discount type</label>
                <select
                  value={sendForm.discountType}
                  onChange={(e) => setSendForm((p) => ({ ...p, discountType: e.target.value }))}
                  className="w-full border border-outline-variant p-3"
                  disabled={!canSend}
                >
                  <option value="percentage">Percentage %</option>
                  <option value="fixed">Fixed LKR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Value</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={sendForm.discountValue}
                  onChange={(e) => setSendForm((p) => ({ ...p, discountValue: e.target.value }))}
                  className="w-full border border-outline-variant p-3"
                  disabled={!canSend}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Valid until</label>
                <input
                  type="date"
                  required
                  value={sendForm.validUntil}
                  onChange={(e) => setSendForm((p) => ({ ...p, validUntil: e.target.value }))}
                  className="w-full border border-outline-variant p-3"
                  disabled={!canSend}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Coupon code (optional)</label>
                <input
                  value={sendForm.code}
                  onChange={(e) => setSendForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full border border-outline-variant p-3"
                  placeholder="Auto-generated if empty"
                  disabled={!canSend}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Limit to services/consultations (optional)
              </label>
              <div className="max-h-36 overflow-y-auto border border-outline-variant/50 p-3 space-y-2">
                {services.map((s) => (
                  <label key={s._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sendForm.applicableServices.includes(s._id)}
                      onChange={() => toggleServiceInForm(s._id, 'send')}
                      disabled={!canSend}
                    />
                    <span>
                      {s.name}
                      {s.isConsultation ? ' (Consultation)' : ''}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSend || sending}
              className="w-full bg-primary text-on-primary py-3 font-label-md disabled:opacity-50"
            >
              {sending ? 'Sending…' : `Send to ${sendForm.userIds.length} selected customer(s)`}
            </button>
          </form>

          <div className="bg-surface border border-outline-variant/50 luxury-shadow p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-title-md font-semibold">Select customers</h2>
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search name or email"
                className="border border-outline-variant px-3 py-2 text-sm w-48"
              />
            </div>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className="text-xs border px-3 py-1 hover:border-primary"
                onClick={() =>
                  setSendForm((p) => ({
                    ...p,
                    userIds: filteredCustomers.map((c) => c._id),
                  }))
                }
                disabled={!canSend}
              >
                Select all filtered
              </button>
              <button
                type="button"
                className="text-xs border px-3 py-1 hover:border-primary"
                onClick={() => setSendForm((p) => ({ ...p, userIds: [] }))}
                disabled={!canSend}
              >
                Clear
              </button>
            </div>
            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
              {filteredCustomers.map((c) => (
                <label
                  key={c._id}
                  className={`flex items-start gap-3 p-3 border cursor-pointer ${
                    sendForm.userIds.includes(c._id)
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sendForm.userIds.includes(c._id)}
                    onChange={() => toggleUser(c._id)}
                    disabled={!canSend}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">{c.name}</span>
                    <span className="block text-xs text-on-surface-variant">{c.email}</span>
                  </span>
                </label>
              ))}
              {filteredCustomers.length === 0 && (
                <p className="text-sm text-gray-500 italic py-8 text-center">No customers found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'coupons' && (
        <div className="space-y-6">
          <div className="bg-surface border border-outline-variant/50 luxury-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/40">
              <h2 className="font-semibold">Sent coupon campaigns</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Discount</th>
                    <th className="px-6 py-3">Recipients</th>
                    <th className="px-6 py-3">Until</th>
                    {(canEdit || canDelete) && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {couponPromos.map((p) => {
                    const linkedCouponId = p.coupon?._id || p.coupon;
                    const linkedCoupon = linkedCouponId
                      ? coupons.find((c) => c._id === linkedCouponId)
                      : null;
                    return (
                      <tr key={p._id}>
                        <td className="px-6 py-3 text-sm font-medium">{p.title}</td>
                        <td className="px-6 py-3 text-sm text-primary font-mono">
                          {p.code || p.coupon?.code || linkedCoupon?.code}
                        </td>
                        <td className="px-6 py-3 text-sm">{discountLabel(p)}</td>
                        <td className="px-6 py-3 text-sm">{(p.sentToUsers || []).length}</td>
                        <td className="px-6 py-3 text-sm">
                          {new Date(p.endDate).toLocaleDateString()}
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-6 py-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              {canEdit && linkedCoupon && (
                                <button
                                  type="button"
                                  title="Edit coupon"
                                  aria-label="Edit coupon"
                                  onClick={() => openEditCoupon(linkedCoupon)}
                                  className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  title="Delete"
                                  aria-label="Delete"
                                  onClick={() => handleDelete(p._id)}
                                  className="inline-flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {couponPromos.length === 0 && (
                    <tr>
                      <td
                        colSpan={canEdit || canDelete ? 6 : 5}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No coupon campaigns sent yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant/50 luxury-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/40">
              <h2 className="font-semibold">All coupons</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Edit discount, expiry, active status, or delete unused codes.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Discount</th>
                    <th className="px-6 py-3">Used</th>
                    <th className="px-6 py-3">Valid until</th>
                    <th className="px-6 py-3">Status</th>
                    {(canEdit || canDelete) && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coupons.map((c) => (
                    <tr key={c._id}>
                      <td className="px-6 py-3 font-mono text-sm text-primary">{c.code}</td>
                      <td className="px-6 py-3 text-sm">
                        {c.discountType === 'percentage'
                          ? `${c.discountValue}%`
                          : `LKR ${c.discountValue}`}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {c.usedCount || 0}
                        {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {new Date(c.validUntil).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={
                            c.isActive
                              ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 text-xs'
                              : 'text-gray-500 bg-gray-100 px-2 py-0.5 text-xs'
                          }
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                title="Edit"
                                aria-label="Edit"
                                onClick={() => openEditCoupon(c)}
                                className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                title="Delete"
                                aria-label="Delete"
                                onClick={() => handleDeleteCoupon(c)}
                                className="inline-flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td
                        colSpan={canEdit || canDelete ? 6 : 5}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No coupons in the system yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-6">
          <div className="bg-surface border border-outline-variant/50 luxury-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/40">
              <h2 className="font-semibold">Coupon usage history</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Bookings where customers applied a coupon code.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Service</th>
                    <th className="px-6 py-3">Booking</th>
                    <th className="px-6 py-3 text-right">Discount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {couponHistory.map((row) => (
                    <tr key={row.appointmentId}>
                      <td className="px-6 py-3 text-sm whitespace-nowrap">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-3 font-mono text-sm text-primary">{row.code}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className="block font-medium">{row.customerName}</span>
                        {row.customerEmail && (
                          <span className="block text-xs text-gray-500">{row.customerEmail}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm">{row.serviceName}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{row.bookingReference}</td>
                      <td className="px-6 py-3 text-sm text-right font-medium text-emerald-700">
                        −LKR {Number(row.discountAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {couponHistory.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No coupon usage history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant/50 luxury-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/40">
              <h2 className="font-semibold">Loyalty redeem history</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Points customers have spent on loyalty offers.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Booking</th>
                    <th className="px-6 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loyaltyHistory.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-3 text-sm whitespace-nowrap">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className="block font-medium">{row.customerName}</span>
                        {row.customerEmail && (
                          <span className="block text-xs text-gray-500">{row.customerEmail}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{row.description}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {row.bookingReference || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-medium text-red-600">
                        −{row.points}
                      </td>
                    </tr>
                  ))}
                  {loyaltyHistory.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No loyalty redeem history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* Catalog modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-secondary">
                {isEditMode ? 'Edit catalog discount' : 'New catalog discount'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCatalogSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleCatalogChange}
                  className="w-full border p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={handleCatalogChange}
                  className="w-full border p-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount type</label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleCatalogChange}
                    className="w-full border p-3"
                  >
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed LKR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <input
                    type="number"
                    name="discountValue"
                    min="0"
                    required
                    value={formData.discountValue}
                    onChange={handleCatalogChange}
                    className="w-full border p-3"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Apply to</label>
                  <select
                    name="targetType"
                    value={formData.targetType}
                    onChange={handleCatalogChange}
                    className="w-full border p-3"
                  >
                    <option value="selected">Selected items</option>
                    <option value="all_services">All services</option>
                    <option value="all_consultations">All consultations</option>
                    <option value="all">All services & consultations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End date</label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    value={formData.endDate}
                    onChange={handleCatalogChange}
                    className="w-full border p-3"
                  />
                </div>
              </div>

              {formData.targetType === 'selected' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Services</p>
                    <div className="max-h-40 overflow-y-auto border p-3 space-y-2">
                      {regularServices.map((s) => (
                        <label key={s._id} className="flex gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.applicableServices.includes(s._id)}
                            onChange={() => toggleServiceInForm(s._id)}
                          />
                          {s.name}
                        </label>
                      ))}
                      {regularServices.length === 0 && (
                        <p className="text-xs text-gray-500">No services found.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Consultations</p>
                    <div className="max-h-40 overflow-y-auto border p-3 space-y-2">
                      {consultationServices.map((s) => (
                        <label key={s._id} className="flex gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.applicableServices.includes(s._id)}
                            onChange={() => toggleServiceInForm(s._id)}
                          />
                          {s.name}
                        </label>
                      ))}
                      {consultationServices.length === 0 && (
                        <p className="text-xs text-gray-500">No consultation services found.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleCatalogChange}
                />
                Active
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-on-primary">
                  {isEditMode ? 'Save changes' : 'Apply discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon edit modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-secondary">Edit coupon</h2>
              <button
                type="button"
                onClick={() => {
                  setIsCouponModalOpen(false);
                  setCouponEditId(null);
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCouponSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <input
                    name="code"
                    required
                    value={couponForm.code}
                    onChange={handleCouponFormChange}
                    className="w-full border p-3 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Valid until</label>
                  <input
                    type="date"
                    name="validUntil"
                    required
                    value={couponForm.validUntil}
                    onChange={handleCouponFormChange}
                    className="w-full border p-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  value={couponForm.description}
                  onChange={handleCouponFormChange}
                  className="w-full border p-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount type</label>
                  <select
                    name="discountType"
                    value={couponForm.discountType}
                    onChange={handleCouponFormChange}
                    className="w-full border p-3"
                  >
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed LKR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <input
                    type="number"
                    name="discountValue"
                    min="0"
                    required
                    value={couponForm.discountValue}
                    onChange={handleCouponFormChange}
                    className="w-full border p-3"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min order (LKR)</label>
                  <input
                    type="number"
                    name="minOrderAmount"
                    min="0"
                    value={couponForm.minOrderAmount}
                    onChange={handleCouponFormChange}
                    className="w-full border p-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max discount (optional)</label>
                  <input
                    type="number"
                    name="maxDiscountAmount"
                    min="0"
                    value={couponForm.maxDiscountAmount}
                    onChange={handleCouponFormChange}
                    className="w-full border p-3"
                    placeholder="No cap"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Usage limit (optional)</label>
                  <input
                    type="number"
                    name="usageLimit"
                    min="0"
                    value={couponForm.usageLimit}
                    onChange={handleCouponFormChange}
                    className="w-full border p-3"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Per-user limit</label>
                  <input
                    type="number"
                    name="perUserLimit"
                    min="1"
                    value={couponForm.perUserLimit}
                    onChange={handleCouponFormChange}
                    className="w-full border p-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Limit to services/consultations (optional)
                </label>
                <div className="max-h-36 overflow-y-auto border p-3 space-y-2">
                  {services.map((s) => (
                    <label key={s._id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={couponForm.applicableServices.includes(s._id)}
                        onChange={() => toggleCouponService(s._id)}
                      />
                      <span>
                        {s.name}
                        {s.isConsultation ? ' (Consultation)' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={couponForm.isActive}
                  onChange={handleCouponFormChange}
                />
                Active (customers can redeem)
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCouponModalOpen(false);
                    setCouponEditId(null);
                  }}
                  className="px-4 py-2 border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="px-4 py-2 bg-primary text-on-primary disabled:opacity-50"
                >
                  {savingCoupon ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loyalty offer modal */}
      {isLoyaltyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-secondary">
                {loyaltyEditMode ? 'Edit loyalty redeem offer' : 'New loyalty redeem offer'}
              </h2>
              <button type="button" onClick={() => setIsLoyaltyModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleLoyaltySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  name="title"
                  required
                  value={loyaltyForm.title}
                  onChange={handleLoyaltyFormChange}
                  className="w-full border p-3"
                  placeholder="100 pts = 15% off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  value={loyaltyForm.description}
                  onChange={handleLoyaltyFormChange}
                  className="w-full border p-3"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Points cost</label>
                  <input
                    type="number"
                    name="pointsCost"
                    min="1"
                    required
                    value={loyaltyForm.pointsCost}
                    onChange={handleLoyaltyFormChange}
                    className="w-full border p-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount type</label>
                  <select
                    name="discountType"
                    value={loyaltyForm.discountType}
                    onChange={handleLoyaltyFormChange}
                    className="w-full border p-3"
                  >
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed LKR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount value</label>
                  <input
                    type="number"
                    name="discountValue"
                    min="0"
                    required
                    value={loyaltyForm.discountValue}
                    onChange={handleLoyaltyFormChange}
                    className="w-full border p-3"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max discount (optional)</label>
                  <input
                    type="number"
                    name="maxDiscountAmount"
                    min="0"
                    value={loyaltyForm.maxDiscountAmount}
                    onChange={handleLoyaltyFormChange}
                    className="w-full border p-3"
                    placeholder="No cap"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Usage limit (optional)</label>
                  <input
                    type="number"
                    name="usageLimit"
                    min="0"
                    value={loyaltyForm.usageLimit}
                    onChange={handleLoyaltyFormChange}
                    className="w-full border p-3"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Per-user limit</label>
                  <input
                    type="number"
                    name="perUserLimit"
                    min="1"
                    value={loyaltyForm.perUserLimit}
                    onChange={handleLoyaltyFormChange}
                    className="w-full border p-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valid until</label>
                <input
                  type="date"
                  name="validUntil"
                  required
                  value={loyaltyForm.validUntil}
                  onChange={handleLoyaltyFormChange}
                  className="w-full border p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Limit to services/consultations (optional — empty = all)
                </label>
                <div className="max-h-36 overflow-y-auto border p-3 space-y-2">
                  {services.map((s) => (
                    <label key={s._id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={loyaltyForm.applicableServices.includes(s._id)}
                        onChange={() => toggleLoyaltyService(s._id)}
                      />
                      <span>
                        {s.name}
                        {s.isConsultation ? ' (Consultation)' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={loyaltyForm.isActive}
                  onChange={handleLoyaltyFormChange}
                />
                Active (customers can redeem)
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoyaltyModalOpen(false)}
                  className="px-4 py-2 border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLoyalty}
                  className="px-4 py-2 bg-primary text-on-primary disabled:opacity-50"
                >
                  {savingLoyalty ? 'Saving…' : loyaltyEditMode ? 'Save changes' : 'Create offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ViewDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Promotion Details"
        data={
          selectedPromo
            ? {
                Title: selectedPromo.title,
                Description: selectedPromo.description,
                Type: selectedPromo.promoType,
                Target: selectedPromo.targetType,
                Discount: discountLabel(selectedPromo),
                'End Date': new Date(selectedPromo.endDate).toLocaleDateString(),
                Status: selectedPromo.isActive ? 'Active' : 'Inactive',
                Services: (selectedPromo.applicableServices || [])
                  .map((s) => s.name || s)
                  .join(', '),
              }
            : {}
        }
      />
    </div>
  );
};

export default PromotionsManagement;
