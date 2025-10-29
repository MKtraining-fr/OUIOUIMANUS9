import React, { useEffect, useState } from 'react';
import { fetchActivePromotions } from '../services/promotionsApi';

import { Gift } from 'lucide-react';
import { Promotion } from '../types/promotions';

const PROMO_ICONS: { [key: string]: string } = {
    "free_shipping": "https://res.cloudinary.com/dmed4shf3/image/upload/v1761748994/manus-promo-icons/free_shipping.svg",
    "percentage": "https://res.cloudinary.com/dmed4shf3/image/upload/v1761748995/manus-promo-icons/percentage.svg",
    "buy_x_get_y": "https://res.cloudinary.com/dmed4shf3/image/upload/v1761748996/manus-promo-icons/buy_x_get_y.svg",
    "default": "https://res.cloudinary.com/dmed4shf3/image/upload/v1761748998/manus-promo-icons/default.svg",
    "time_range": "https://res.cloudinary.com/dmed4shf3/image/upload/v1761748999/manus-promo-icons/time_range.svg",
};

const ActivePromotionsDisplay: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        const activePromos = await fetchActivePromotions();
        setPromotions(activePromos);
      } catch (error) {
        console.error('Error loading promotions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPromotions();
  }, []);

  // Filter out promo code promotions (codes secrets)
  const visiblePromotions = promotions.filter(promo => {
    if (promo.type === 'promo_code') return false;
    
    return true;
  });

  if (loading || visiblePromotions.length === 0) return null;

  const getPromotionIconUrl = (promo: Promotion): string => {
    if (promo.type === 'free_shipping') return PROMO_ICONS.free_shipping;
    if (promo.type === 'percentage') return PROMO_ICONS.percentage;
    if (promo.conditions?.time_range) return PROMO_ICONS.time_range;
    if (promo.type === 'buy_x_get_y') return PROMO_ICONS.buy_x_get_y;
    return PROMO_ICONS.default;
  };

  const getPromotionDescription = (promo: Promotion) => {
    const discount = promo.discount;
    const conditions = promo.conditions;

    let description = promo.description || promo.name;
    
    // Add conditions info
    if (conditions?.min_order_amount) {
      description += ` (Mínimo: ${conditions.min_order_amount.toLocaleString()})`;
    }

    if (conditions?.time_range) {
      description += ` (${conditions.time_range.start_time} - ${conditions.time_range.end_time})`;
    }

    if (promo.type === 'promo_code' && discount?.promo_code) {
      description += ` (Código: ${discount.promo_code})`;
    }

    return description;
  };

  return (
    <div className="mb-4 space-y-2">
      <h3 className="text-lg font-bold text-gray-900 flex items-center drop-shadow-md">
        <Gift className="mr-2" size={22} />
        Promociones Activas
      </h3>
      <div className="space-y-2">
        {visiblePromotions.map((promo) => {
          const bgColor = promo.visuals?.badge_bg_color || '#4CAF50';
          const bannerImage = promo.visuals?.banner_image;
          const bannerText = promo.visuals?.banner_text;
          
          // Si une bannière d'image est disponible, l'afficher en grand
          if (bannerImage) {
            return (
              <div
                key={promo.id}
                className="relative overflow-hidden rounded-lg shadow-md transition-transform hover:scale-[1.02]"
              >
                <img
                  src={bannerImage}
                  alt={promo.name}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                  <div className="text-white">
                    <p className="font-bold text-lg drop-shadow-md">{promo.name}</p>
                    {bannerText && (
                      <p className="text-sm drop-shadow-md">{bannerText}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          // Sinon, afficher le format compact habituel
          return (
                     <div
                  className="flex items-center rounded-lg shadow-sm transition-transform hover:scale-[1.01] overflow-hidden"
              style={{
                borderLeftColor: bgColor,
                background: `linear-gradient(to right, ${bgColor}15, white)`,
              }}
                      >
                      <div
                className="flex items-center justify-center w-10 h-10 flex-shrink-0"       style={{ backgroundColor: bgColor, color: promo.visuals?.badge_color || '#FFFFFF' }}
              >
                <img src={getPromotionIconUrl(promo)} alt={promo.name} className="w-full h-full object-contain p-1" />
                </div>              <div className="flex-1 px-2 py-1 flex items-center justify-between">
                <p className="font-bold text-gray-900 text-sm">{promo.name}</p>
                <p className="text-xs text-gray-600 truncate ml-2">{getPromotionDescription(promo)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivePromotionsDisplay;
