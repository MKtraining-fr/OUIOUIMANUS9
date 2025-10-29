import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import { CheckCircle, ChefHat, FileText, PackageCheck, User, MapPin, Receipt, Phone, Gift } from 'lucide-react';

const PROMO_ICONS: { [key: string]: string } = {
    "free_shipping": "https://res.cloudinary.com/dmed4shf3/image/upload/v1700000000/manus-promo-icons/free_shipping.png",
    "percentage": "https://res.cloudinary.com/dmed4shf3/image/upload/v1700000000/manus-promo-icons/percentage.png",
    "buy_x_get_y": "https://res.cloudinary.com/dmed4shf3/image/upload/v1700000000/manus-promo-icons/buy_x_get_y.png",
    "default": "https://res.cloudinary.com/dmed4shf3/image/upload/v1700000000/manus-promo-icons/default.png",
    "time_range": "https://res.cloudinary.com/dmed4shf3/image/upload/v1700000000/manus-promo-icons/time_range.png",
};
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import {
    clearActiveCustomerOrder,
    getActiveCustomerOrder,
    ONE_DAY_IN_MS,
    storeActiveCustomerOrder,
} from '../services/customerOrderStorage';
import Modal from './Modal';

type TrackerProgressStyle = React.CSSProperties & {
    '--tracker-progress-target': string;
};

const saveOrderToHistory = (order: Order) => {
    try {
        const historyJSON = localStorage.getItem('customer-order-history');
        const history: Order[] = historyJSON ? JSON.parse(historyJSON) : [];
        const existingIndex = history.findIndex(h => h.id === order.id);

        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(order); // Add to the beginning so most recent stays first

        const trimmedHistory = history.slice(0, 10); // Keep last 10 orders
        localStorage.setItem('customer-order-history', JSON.stringify(trimmedHistory));
    } catch (e) {
        console.error("Failed to save order to history:", e);
    }
};

interface CustomerOrderTrackerProps {
  orderId: string;
  onNewOrderClick: () => void;
  variant?: 'page' | 'hero';
}

const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({ orderId, onNewOrderClick, variant = 'page' }) => {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);

    const steps = [
        { name: 'Enviado', icon: FileText, description: 'Commande transmise et en attente de validation.' },
        { name: 'Validado', icon: CheckCircle, description: 'La commande est validée par l’équipe.' },
        { name: 'En preparacion', icon: ChefHat, description: 'La cuisine prépare activement votre commande.' },
        { name: 'Listo', icon: PackageCheck, description: 'La commande est prête pour la remise ou la livraison.' }
    ];

    const promotionColorSchemes = useMemo(
        () => [
            {
                gradient: 'from-brand-primary to-brand-primary-dark',
                border: 'border-brand-primary/40',
                glow: 'shadow-[0_10px_25px_rgba(249,168,38,0.35)]',
            },
            {
                gradient: 'from-emerald-500 to-emerald-600',
                border: 'border-emerald-200/70',
                glow: 'shadow-[0_10px_25px_rgba(16,185,129,0.35)]',
            },
            {
                gradient: 'from-sky-500 to-indigo-600',
                border: 'border-sky-200/70',
                glow: 'shadow-[0_10px_25px_rgba(56,189,248,0.35)]',
            },
            {
                gradient: 'from-rose-500 to-red-600',
                border: 'border-rose-200/70',
                glow: 'shadow-[0_10px_25px_rgba(244,114,182,0.35)]',
            },
            {
                gradient: 'from-amber-500 to-orange-600',
                border: 'border-amber-200/70',
                glow: 'shadow-[0_10px_25px_rgba(251,191,36,0.35)]',
            },
        ],
        []
    );

    const getCurrentStepIndex = useCallback((order: Order | null): number => {
        if (!order) return -1;

        if (
            order.statut === 'finalisee' ||
            order.estado_cocina === 'servido' ||
            order.estado_cocina === 'entregada' ||
            order.estado_cocina === 'listo'
        ) {
            return 3;
        }

        if (order.estado_cocina === 'recibido' || order.statut === 'en_cours') {
            return 2;
        }

        if (order.statut === 'pendiente_validacion' || order.estado_cocina === 'no_enviado') {
            return 1;
        }

        return 0;
    }, []);

    const currentStep = useMemo(() => getCurrentStepIndex(order), [order, getCurrentStepIndex]);

    const heroProgressRef = useRef<HTMLDivElement | null>(null);

    const stepCount = Math.max(steps.length - 1, 1);
    const isOrderCompleted = Boolean(
        order && (
            order.statut === 'finalisee' ||
            order.estado_cocina === 'servido' ||
            order.estado_cocina === 'entregada' ||
            order.estado_cocina === 'listo'
        )
    );
    const normalizedStepIndex = Math.max(0, currentStep);
    const progressPercent = stepCount > 0
        ? Math.min(100, ((isOrderCompleted ? stepCount : normalizedStepIndex) / stepCount) * 100)
        : 100;
    const clampedProgressPercent = Math.max(0, Math.min(100, progressPercent));
    const progressAnimationKey = `${clampedProgressPercent}-${isOrderCompleted ? 'complete' : 'active'}`;
    const progressStyle = useMemo<TrackerProgressStyle>(
        () => ({
            '--tracker-progress-target': `${clampedProgressPercent}%`,
        }),
        [clampedProgressPercent]
    );

    useEffect(() => {
        if (variant !== 'hero') {
            return;
        }

        const node = heroProgressRef.current;
        if (!node) {
            return;
        }

        node.style.setProperty('--tracker-progress-target', `${clampedProgressPercent}%`);
    }, [variant, clampedProgressPercent]);

    useEffect(() => {
        let isMounted = true;
        let interval: ReturnType<typeof setInterval> | null = null;
        let unsubscribe: (() => void) | undefined;
        let isFetching = false;

        const fetchStatus = async () => {
            if (isFetching) {
                return;
            }

            isFetching = true;

            try {
                const orderStatus = await api.getCustomerOrderStatus(orderId);
                if (isMounted) {
                    setOrder(orderStatus);
                    if (
                        orderStatus?.statut === 'finalisee' ||
                        orderStatus?.estado_cocina === 'servido' ||
                        orderStatus?.estado_cocina === 'entregada'
                    ) {
                        if (interval) {
                            clearInterval(interval);
                            interval = null;
                        }
                        saveOrderToHistory(orderStatus);
                        const servedAt = orderStatus.date_servido ?? Date.now();
                        storeActiveCustomerOrder(orderStatus.id, servedAt + ONE_DAY_IN_MS);
                    }
                    if (!orderStatus) {
                        const active = getActiveCustomerOrder();
                        if (active?.orderId === orderId) {
                            clearActiveCustomerOrder();
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch order status", e);
            } finally {
                if (isMounted) {
                    setLoading(prev => (prev ? false : prev));
                }
                isFetching = false;
            }
        };

        setLoading(true);
        setOrder(null);
        fetchStatus();
        interval = setInterval(fetchStatus, 5000);
        unsubscribe = api.notifications.subscribe('orders_updated', fetchStatus);

        return () => {
            isMounted = false;
            if (interval) {
                clearInterval(interval);
            }
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [orderId]);

    const containerClasses = variant === 'page'
        ? "container mx-auto p-4 lg:p-8"
        : "w-full px-4 pt-0 pb-4 sm:pt-1 sm:pb-5 flex justify-center";

    const contentClasses = variant === 'page'
        ? "bg-white/95 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto"
        : "max-w-4xl mx-auto";

    const detailContainerClasses = 'border-t pt-6 mt-6 space-y-4 relative md:w-1/2 md:mx-auto';

    if (loading) {
        return <div className={containerClasses}>Chargement du suivi de commande...</div>;
    }

    if (!order) {
        // If order is not found and variant is hero (on home page), display nothing or a subtle message
        if (variant === 'hero') {
            return null; // Or a subtle message like 'No active order found.'
        }
        // For 'page' variant (on /commande-client), display the original message
        return (
            <div className={containerClasses}>
                <div className={contentClasses}>
                    <h2 className={`text-2xl font-bold mb-4 text-red-600`}>Commande non trouvée</h2>
                    <p className={`text-gray-600 mb-6`}>Nous n'avons pas pu retrouver votre commande.</p>
                    <button onClick={onNewOrderClick} className="bg-brand-primary text-brand-secondary font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition">
                        Passer une nouvelle commande
                    </button>
                </div>
            </div>
        );
    }
    
    const originalSubtotal = order.subtotal ?? order.total ?? 0;
    const totalDiscount = order.total_discount ?? 0;
    const subtotalAfterDiscounts = Math.max(originalSubtotal - totalDiscount, 0);
    const hasAppliedPromotions = (order.applied_promotions?.length ?? 0) > 0;
    const isTakeawayOrder = order.type === 'a_emporter';
    const clientName = order.clientInfo?.nom ?? order.client_name ?? '';
    const clientPhone = order.clientInfo?.telephone ?? order.client_phone ?? '';
    const clientAddress = order.clientInfo?.adresse ?? order.client_address ?? '';
    const hasClientDetails = Boolean(clientName || clientPhone || clientAddress);

    const getPromotionIconUrl = (promo: { type: string, conditions?: { time_range?: unknown } }): string => {
        if (promo.type === 'free_shipping') return PROMO_ICONS.free_shipping;
        if (promo.type === 'percentage') return PROMO_ICONS.percentage;
        if (promo.conditions?.time_range) return PROMO_ICONS.time_range;
        if (promo.type === 'buy_x_get_y') return PROMO_ICONS.buy_x_get_y;
        return PROMO_ICONS.default;
    };

    const promotionBanners = hasAppliedPromotions
        ? order.applied_promotions!.map((promotion, index) => {
            const promoConfig = typeof promotion.config === 'object' && promotion.config !== null
                ? (promotion.config as Record<string, unknown>)
                : undefined;
            const promoCode = promoConfig?.promo_code as string | undefined;
            const visuals = promotion.visuals || null;
            const discountAmount = promotion.discount_amount || 0;
            const scheme = promotionColorSchemes[index % promotionColorSchemes.length];

            const bannerPaddingClass = variant === 'hero' ? 'p-1.5 sm:p-2' : 'p-3 sm:p-4';
            const bannerGapClass = variant === 'hero' ? 'gap-3' : 'gap-4';
            const bannerMediaClass = variant === 'hero'
                ? 'relative h-6 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-white/15'
                : 'relative h-8 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white/15';
            const bannerFallbackTextClass = variant === 'hero'
                ? 'flex h-full w-full items-center justify-center px-2 text-center text-[9px] font-semibold leading-tight text-white'
                : 'flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight text-white';
            const bannerTitleClass = variant === 'hero'
                ? 'text-xs font-semibold tracking-wide text-white whitespace-nowrap truncate'
                : 'text-sm font-semibold tracking-wide text-white whitespace-nowrap truncate';
            const bannerCodeClass = variant === 'hero'
                ? 'text-[9px] font-medium uppercase tracking-wide text-white/85 whitespace-nowrap'
                : 'text-[11px] font-medium uppercase tracking-wide text-white/85 whitespace-nowrap';
            const discountTextClass = variant === 'hero'
                ? 'block text-xs font-bold text-white'
                : 'block text-sm font-bold text-white';
            const overlayTextClass = variant === 'hero'
                ? 'absolute bottom-1 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide'
                : 'absolute bottom-1 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

            return (
                <div
                    key={`${promotion.promotion_id}-${promotion.name}`}
                    className={`promo-banner flex w-full items-center ${bannerGapClass} overflow-hidden rounded-2xl border bg-gradient-to-r ${bannerPaddingClass} text-white shadow-lg ${scheme.gradient} ${scheme.border} ${scheme.glow}`}
                    aria-label={`Promotion ${promotion.name}`}
                >
                    <div className={bannerMediaClass}>
                        {visuals?.banner_image ? (
                            <>
                                <img
                                    src={visuals.banner_image}
                                    alt={visuals.banner_text || promotion.name}
                                    className="h-full w-full object-cover opacity-95"
                                />
                                {visuals.banner_text && (
                                    <div className={overlayTextClass}>
                                        {visuals.banner_text}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={bannerFallbackTextClass}>
                                {promotion.name}
                            </div>
                        )}
                        {/* Utilisation de l'icône Cloudinary si pas d'image de bannière */}
                        {!visuals?.banner_image && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <img
                                    src={getPromotionIconUrl(promotion)}
                                    alt={promotion.name}
                                    className="w-full h-full object-contain p-1"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col text-left">
                        {(!visuals?.banner_image || !visuals?.banner_text) && (
                            <span className={bannerTitleClass} title={promotion.name}>
                                {promotion.name}
                            </span>
                        )}
                        {promoCode && (
                            <span className={bannerCodeClass}>
                                Code: {promoCode}
                            </span>
                        )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                        <span className={discountTextClass}>
                            -{formatCurrencyCOP(discountAmount)}
                        </span>
                    </div>
                </div>
            );
        })
        : null;

    const promotionsSectionContent = promotionBanners
        ? (
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-800">Promotions Appliquées</h3>
                {promotionBanners}
            </div>
        )
        : null;

    if (variant === 'hero') {
        return (
            <div className={containerClasses}>
                <div className={contentClasses}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Suivi de Commande</h2>
                        <button
                            onClick={() => setReceiptModalOpen(true)}
                            className="text-sm font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            aria-label="Afficher le justificatif de paiement"
                        >
                            <Receipt className="h-4 w-4" />
                            Justificatif
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Commande #{order.id}</p>
                                <p className="text-xs text-gray-500">Total: {formatCurrencyCOP(order.total)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">Statut Actuel</p>
                            <p className="text-xs font-medium text-amber-600">
                                {steps[normalizedStepIndex].description}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar for Hero Variant */}
                    <div className="mt-4">
                        <div
                            ref={heroProgressRef}
                            className="tracker-progress-container tracker-progress-hero"
                            style={progressStyle}
                            key={`hero-progress-${progressAnimationKey}`}
                        >
                            <div
                                className={`tracker-progress-fill ${isOrderCompleted ? 'tracker-progress-fill-complete' : ''}`}
                            ></div>
                        </div>
                    </div>

                    {promotionsSectionContent && (
                        <div className="mt-4 border-t pt-4">
                            <h3 className="text-sm font-bold text-gray-800 mb-2">Promotions</h3>
                            <div className="space-y-2">
                                {promotionBanners}
                            </div>
                        </div>
                    )}

                    {isOrderCompleted ? (
                        <div className="mt-4 border-t pt-4">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-green-600">
                                    Commande Terminée
                                </span>
                                <button
                                    onClick={onNewOrderClick}
                                    className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-brand-secondary shadow-lg transition hover:bg-yellow-400"
                                >
                                    Revenir au menu
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 border-t pt-4">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                                    Nous préparons votre commande
                                </span>
                                <button
                                    onClick={isOrderCompleted ? onNewOrderClick : undefined}
                                    disabled={!isOrderCompleted}
                                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
                                        isOrderCompleted
                                            ? 'bg-white text-amber-600 shadow-lg hover:bg-white/90'
                                            : 'cursor-not-allowed bg-white/10 text-white/50'
                                    }`}
                                >
                                    Revenir au menu
                                </button>
                            </div>
                        </div>
                    )}

                    <Modal
                        isOpen={isReceiptModalOpen}
                        onClose={() => setReceiptModalOpen(false)}
                        title="Justificatif de Paiement"
                    >
                        {order.receipt_url ? (
                            <img src={order.receipt_url} alt="Justificatif" className="h-auto w-full rounded-md" />
                        ) : (
                            <p>Aucun justificatif fourni.</p>
                        )}
                    </Modal>
                </div>
            </div>
        );
    }

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Suivi de Commande #{order.id}</h1>

                {/* Progress Tracker */}
                <div className="mb-6 tracker-progress-container tracker-progress-default">
                    <div
                        key={`page-progress-${progressAnimationKey}`}
                        className={`tracker-progress-fill ${isOrderCompleted ? 'tracker-progress-fill-complete' : ''}`}
                        style={progressStyle}
                    ></div>
                    <div className="flex justify-between relative z-10">
                        {steps.map((step, index) => (
                            <div
                                key={step.name}
                                className={`flex flex-col items-center text-center w-1/4 transition-colors duration-500 ${
                                    index <= normalizedStepIndex ? 'text-brand-primary' : 'text-gray-400'
                                }`}
                            >
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-500 ${
                                        index <= normalizedStepIndex
                                            ? 'border-brand-primary bg-white shadow-md'
                                            : 'border-gray-300 bg-gray-100'
                                    }`}
                                >
                                    <step.icon className="h-5 w-5" />
                                </div>
                                <p className="mt-2 text-xs font-semibold">{step.name}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current Status and Details */}
                <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Statut Actuel</h2>
                    <p className="text-lg font-medium text-amber-600">
                        {steps[normalizedStepIndex].description}
                    </p>
                </div>

                {/* Order Summary */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Récapitulatif de la Commande</h2>
                        {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-start border-b border-gray-100 pb-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-sm font-bold text-gray-800">{item.quantity}x</span>
                                    <p className="text-sm font-medium text-gray-700 leading-tight">
                                        {item.product_name}
                                        {item.notes && (
                                            <span className="block text-xs text-gray-500 italic">
                                                ({item.notes})
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">
                                    {formatCurrencyCOP(item.total_price)}
                                </span>
                            </div>
                        ))}

                        <div className="space-y-1 pt-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Sous-total:</span>
                                <span>{formatCurrencyCOP(originalSubtotal)}</span>
                            </div>
                            {totalDiscount > 0 && (
                                <div className="flex justify-between text-sm font-semibold text-green-600">
                                    <span>Rabais Appliqués:</span>
                                    <span>-{formatCurrencyCOP(totalDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-gray-800 border-t pt-2 mt-2">
                                <span>Total à Payer:</span>
                                <span>{formatCurrencyCOP(order.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Client and Delivery Info */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Informations Client</h2>
                        {hasClientDetails ? (
                            <div className="space-y-3">
                                {clientName && (
                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-brand-primary" />
                                        <p className="text-sm text-gray-700 font-medium">{clientName}</p>
                                    </div>
                                )}
                                {clientPhone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-brand-primary" />
                                        <p className="text-sm text-gray-700 font-medium">{clientPhone}</p>
                                    </div>
                                )}
                                {clientAddress && (
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-brand-primary" />
                                        <p className="text-sm text-gray-700 font-medium">{clientAddress}</p>
                                    </div>
                                )}
                                {!clientAddress && isTakeawayOrder && (
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-brand-primary" />
                                        <p className="text-sm text-gray-700 font-medium">À emporter</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Détails client non fournis.</p>
                        )}

                        {/* Promotions Section */}
                        {promotionsSectionContent && (
                            <div className="pt-4 border-t">
                                {promotionsSectionContent}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-4 border-t flex flex-col gap-3">
                            <button
                                onClick={() => setReceiptModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                                aria-label="Afficher le justificatif de paiement"
                            >
                                <Receipt className="h-4 w-4" />
                                Afficher le Justificatif de Paiement
                            </button>
                            <button
                                onClick={isOrderCompleted ? onNewOrderClick : undefined}
                                disabled={!isOrderCompleted}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                    isOrderCompleted
                                        ? 'bg-brand-primary text-brand-secondary shadow-lg hover:bg-yellow-400'
                                        : 'cursor-not-allowed bg-gray-300 text-gray-500'
                                }`}
                            >
                                Revenir au menu
                            </button>
                        </div>
                    </div>
                </div>

                <Modal
                    isOpen={isReceiptModalOpen}
                    onClose={() => setReceiptModalOpen(false)}
                    title="Justificatif de Paiement"
                >
                    {order.receipt_url ? (
                        <img src={order.receipt_url} alt="Justificatif" className="h-auto w-full rounded-md" />
                    ) : (
                        <p>Aucun justificatif fourni.</p>
                    )}
                </Modal>
            </div>
        </div>
    );
};

export default CustomerOrderTracker;
