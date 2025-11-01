import React, { useState } from 'react';
import { Clock, Edit2, Mail, MapPin, Star } from 'lucide-react';
import {
  EditableElementKey,
  EditableZoneKey,
  Product,
  SiteContent,
} from '../types';
import useCustomFonts from '../hooks/useCustomFonts';
import {
  createBackgroundStyle,
  createBodyTextStyle,
  createElementBackgroundStyle,
  createElementBodyTextStyle,
  createElementTextStyle,
  createHeroBackgroundStyle,
  createTextStyle,
} from '../utils/siteStyleHelpers';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';
import { withAppendedQueryParam } from '../utils/url';

const DEFAULT_BRAND_LOGO = '/logo-brand.svg';

export const resolveZoneFromElement = (element: EditableElementKey): EditableZoneKey => {
  if (element.startsWith('navigation.')) {
    return 'navigation';
  }
  if (element.startsWith('hero.')) {
    return 'hero';
  }
  if (element.startsWith('about.')) {
    return 'about';
  }
  if (element.startsWith('menu.')) {
    return 'menu';
  }
  if (element.startsWith('instagramReviews.')) {
    return 'instagramReviews';
  }
  if (element.startsWith('findUs.')) {
    return 'findUs';
  }
  if (element.startsWith('footer.')) {
    return 'footer';
  }

  throw new Error(`Zone introuvable pour l'élément modifiable "${element}"`);
};

interface SitePreviewCanvasProps {
  content: SiteContent;
  bestSellerProducts: Product[];
  onEdit: (
    element: EditableElementKey,
    meta: {
      zone: EditableZoneKey;
      anchor: DOMRect | DOMRectReadOnly | null;
      boundary: DOMRect | DOMRectReadOnly | null;
    },
  ) => void;
  activeZone?: EditableZoneKey | null;
  showEditButtons?: boolean;
}

interface EditableElementProps {
  id: EditableElementKey;
  onEdit: SitePreviewCanvasProps['onEdit'];
  children: React.ReactNode;
  label: string;
  className?: string;
  buttonClassName?: string;
  as?: keyof JSX.IntrinsicElements;
}

const EditButtonVisibilityContext = React.createContext(true);

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  zone: EditableZoneKey;
  activeZone?: EditableZoneKey | null;
}

const EditableElement: React.FC<EditableElementProps> = ({
  id,
  onEdit,
  children,
  label,
  className,
  buttonClassName,
  as: Component = 'div',
}) => {
  const containerClasses = ['group relative', className].filter(Boolean).join(' ');
  const showButtons = React.useContext(EditButtonVisibilityContext);
  const [isHovered, setIsHovered] = useState(false);

  if (!showButtons) {
    return <Component className={containerClasses}>{children}</Component>;
  }
  const buttonClasses = [
    'customization-edit-button absolute z-30 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all duration-200',
    'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
    'hover:scale-110 hover:bg-blue-600 active:scale-95',
    buttonClassName ?? 'right-2 top-2',
  ]
    .filter(Boolean)
    .join(' ');

  const handleEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const zone = resolveZoneFromElement(id);
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const anchorElement =
      (event.currentTarget.closest(`[data-zone="${zone}"]`) as HTMLElement | null) ??
      (event.currentTarget.parentElement as HTMLElement | null);
    const fallbackRect = anchorElement?.getBoundingClientRect() ?? null;
    const previewBoundary = event.currentTarget.closest('[data-preview-boundary="true"]') as
      | HTMLElement
      | null;
    const boundaryRect = previewBoundary?.getBoundingClientRect() ?? null;

    onEdit(id, {
      zone,
      anchor: buttonRect ?? fallbackRect,
      boundary: boundaryRect,
    });
  };

  return (
    <Component 
      className={containerClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={handleEdit}
        className={buttonClasses}
        aria-label={label}
        data-element-id={id}
        title={label}
      >
        <Edit2 className="h-4 w-4" aria-hidden="true" />
      </button>
      
      {/* Indicateur de survol amélioré */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 border-dashed rounded-lg opacity-50 animate-pulse" />
      )}
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute z-40 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          {label}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
      
      {children}
    </Component>
  );
};

const SectionCard: React.FC<SectionCardProps> = ({ children, className, zone, activeZone }) => {
  const isActive = activeZone === zone;
  const classes = [
    'customization-section-card relative overflow-hidden rounded-3xl border bg-white shadow-sm transition-all',
    isActive ? 'active border-brand-primary/70 shadow-brand-primary/20 ring-2 ring-brand-primary/10' : 'border-gray-200',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-zone={zone}>
      {children}
    </div>
  );
};

const SitePreviewCanvas: React.FC<SitePreviewCanvasProps> = ({
  content,
  bestSellerProducts,
  onEdit,
  activeZone,
  showEditButtons = true,
}) => {
  const navigationBackgroundStyle = createBackgroundStyle(content.navigation.style);
  const navigationTextStyle = createTextStyle(content.navigation.style);
  const navigationBodyStyle = createBodyTextStyle(content.navigation.style);
  const brandLogo = content.navigation.brandLogo ?? DEFAULT_BRAND_LOGO;
  const staffTriggerLogo =
    content.navigation.staffLogo ?? content.navigation.brandLogo ?? DEFAULT_BRAND_LOGO;
  const heroBackgroundStyle = createHeroBackgroundStyle(content.hero.style, content.hero.backgroundImage);
  const heroTextStyle = createTextStyle(content.hero.style);
  const heroBodyTextStyle = createBodyTextStyle(content.hero.style);
  const aboutBackgroundStyle = createBackgroundStyle(content.about.style);
  const aboutTextStyle = createTextStyle(content.about.style);
  const aboutBodyTextStyle = createBodyTextStyle(content.about.style);
  const menuBackgroundStyle = createBackgroundStyle(content.menu.style);
  const menuTextStyle = createTextStyle(content.menu.style);
  const menuBodyTextStyle = createBodyTextStyle(content.menu.style);
  const findUsBackgroundStyle = createBackgroundStyle(content.findUs.style);
  const findUsTextStyle = createTextStyle(content.findUs.style);
  const footerBackgroundStyle = createBackgroundStyle(content.footer.style);
  const footerTextStyle = createBodyTextStyle(content.footer.style);

  useCustomFonts(content.assets.library);

  const elementStyles = content.elementStyles ?? {};
  const elementRichText = content.elementRichText ?? {};
  const isCustomizationMode = showEditButtons;

  const getRichTextHtml = (key: EditableElementKey): string | null => {
    const entry = elementRichText[key];
    const html = entry?.html?.trim();
    return html && html.length > 0 ? html : null;
  };

  const renderRichTextElement = <T extends keyof JSX.IntrinsicElements>(
    key: EditableElementKey,
    Component: T,
    props: React.ComponentPropsWithoutRef<T>,
    fallback: string,
  ) => {
    const html = getRichTextHtml(key);
    if (html) {
      return React.createElement(Component, {
        ...props,
        dangerouslySetInnerHTML: { __html: html },
      });
    }
    return React.createElement(Component, props, fallback);
  };

  const zoneStyleMap: Record<EditableZoneKey, typeof content.navigation.style> = {
    navigation: content.navigation.style,
    hero: content.hero.style,
    about: content.about.style,
    menu: content.menu.style,
    instagramReviews: content.instagramReviews.style,
    findUs: content.findUs.style,
    footer: content.footer.style,
  };

  const getElementStyle = (key: EditableElementKey) => elementStyles[key];

  const getElementTextStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementTextStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  const getElementBodyTextStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementBodyTextStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  const getElementBackgroundStyle = (key: EditableElementKey) => {
    const zone = resolveZoneFromElement(key);
    return createElementBackgroundStyle(zoneStyleMap[zone], getElementStyle(key));
  };

  const findUsMapQuery = content.findUs.address.trim();
  const customFindUsMapUrlRaw = content.findUs.mapUrl;
  const customFindUsMapUrl = typeof customFindUsMapUrlRaw === 'string' ? customFindUsMapUrlRaw.trim() : '';
  const hasCustomMapUrl = customFindUsMapUrl.length > 0;
  const encodedFindUsQuery = !hasCustomMapUrl && findUsMapQuery.length > 0
    ? encodeURIComponent(findUsMapQuery)
    : '';
  const findUsMapUrl = hasCustomMapUrl
    ? customFindUsMapUrl
    : encodedFindUsQuery
      ? `https://www.google.com/maps?q=${encodedFindUsQuery}`
      : 'https://www.google.com/maps';
  const findUsMapEmbedUrl = hasCustomMapUrl
    ? withAppendedQueryParam(customFindUsMapUrl, 'output', 'embed')
    : encodedFindUsQuery
      ? `https://www.google.com/maps?q=${encodedFindUsQuery}&output=embed`
      : 'about:blank';
  const hasMapLocation = hasCustomMapUrl || encodedFindUsQuery.length > 0;
  const findUsMapTitle = findUsMapQuery.length > 0 ? findUsMapQuery : content.findUs.title;

  return (
    <EditButtonVisibilityContext.Provider value={showEditButtons}>
      <div
        className="space-y-6 rounded-[2.5rem] border border-gray-200 bg-slate-50 p-6 shadow-inner"
        data-preview-boundary="true"
      >
        <SectionCard zone="navigation" activeZone={activeZone}>
          <EditableElement
            id="navigation.style.background"
            label="Modifier le fond de la navigation"
            onEdit={onEdit}
            className="block"
            buttonClassName="right-4 top-4"
          >
            <header className="site-header" style={{ ...navigationBackgroundStyle, ...navigationTextStyle }}>
              <div className="layout-container site-header__inner" style={navigationTextStyle}>
                <EditableElement
                  id="navigation.brand"
                  label="Modifier le nom de la marque"
                  onEdit={onEdit}
                  className="flex-shrink-0"
                  buttonClassName="-right-2 -top-2"
                >
                  <a href="/" className="login-brand" style={navigationTextStyle}>
                    <EditableElement
                      id="navigation.brandLogo"
                      label="Modifier le logo de la marque"
                      onEdit={onEdit}
                      className="block"
                      buttonClassName="-right-2 -top-2"
                    >
                      <img src={brandLogo} alt="" className="login-brand__logo" aria-hidden="true" />
                    </EditableElement>
                    {renderRichTextElement(
                      'navigation.brand',
                      'span',
                      {
                        className: 'login-brand__text',
                        style: getElementTextStyle('navigation.brand'),
                      },
                      content.navigation.brand,
                    )}
                  </a>
                </EditableElement>
                <nav className="login-nav" aria-label="Navigation principale">
                  <EditableElement
                    id="navigation.links.home"
                    label="Modifier le lien Accueil"
                    onEdit={onEdit}
                    className="inline-flex"
                    buttonClassName="-right-3 -top-3"
                    as="span"
                  >
                    <a href="#" className="login-nav__link" style={navigationBodyStyle}>
                      {renderRichTextElement(
                        'navigation.links.home',
                        'span',
                        {
                          style: getElementBodyTextStyle('navigation.links.home'),
                        },
                        content.navigation.links.home,
                      )}
                    </a>
                  </EditableElement>
                  <EditableElement
                    id="navigation.links.menu"
                    label="Modifier le lien Menu"
                    onEdit={onEdit}
                    className="inline-flex"
                    buttonClassName="-right-3 -top-3"
                    as="span"
                  >
                    <a href="#" className="login-nav__link" style={navigationBodyStyle}>
                      {renderRichTextElement(
                        'navigation.links.menu',
                        'span',
                        {
                          style: getElementBodyTextStyle('navigation.links.menu'),
                        },
                        content.navigation.links.menu,
                      )}
                    </a>
                  </EditableElement>
                  <EditableElement
                    id="navigation.links.about"
                    label="Modifier le lien À propos"
                    onEdit={onEdit}
                    className="inline-flex"
                    buttonClassName="-right-3 -top-3"
                    as="span"
                  >
                    <a href="#" className="login-nav__link" style={navigationBodyStyle}>
                      {renderRichTextElement(
                        'navigation.links.about',
                        'span',
                        {
                          style: getElementBodyTextStyle('navigation.links.about'),
                        },
                        content.navigation.links.about,
                      )}
                    </a>
                  </EditableElement>
                  <EditableElement
                    id="navigation.links.contact"
                    label="Modifier le lien Contact"
                    onEdit={onEdit}
                    className="inline-flex"
                    buttonClassName="-right-3 -top-3"
                    as="span"
                  >
                    <a href="#" className="login-nav__link" style={navigationBodyStyle}>
                      {renderRichTextElement(
                        'navigation.links.contact',
                        'span',
                        {
                          style: getElementBodyTextStyle('navigation.links.contact'),
                        },
                        content.navigation.links.contact,
                      )}
                    </a>
                  </EditableElement>
                </nav>
                <EditableElement
                  id="navigation.staffLogo"
                  label="Modifier le logo du personnel"
                  onEdit={onEdit}
                  className="flex-shrink-0"
                  buttonClassName="-right-2 -top-2"
                >
                  <img src={staffTriggerLogo} alt="" className="login-brand__logo" aria-hidden="true" />
                </EditableElement>
              </div>
            </header>
          </EditableElement>
        </SectionCard>

        <SectionCard zone="hero" activeZone={activeZone}>
          <EditableElement
            id="hero.backgroundImage"
            label="Modifier le visuel de fond du hero"
            onEdit={onEdit}
            className="block"
            buttonClassName="right-4 top-4"
          >
            <section className="section section-hero" style={{ ...heroBackgroundStyle, ...heroTextStyle }}>
              <div className="section-hero__inner">
                <div className="hero-content" style={heroTextStyle}>
                  <EditableElement
                    id="hero.title"
                    label="Modifier le titre du hero"
                    onEdit={onEdit}
                    className="block"
                    buttonClassName="right-0 -top-3"
                  >
                    {renderRichTextElement(
                      'hero.title',
                      'h1',
                      {
                        className: 'hero-title',
                        style: getElementTextStyle('hero.title'),
                      },
                      content.hero.title,
                    )}
                  </EditableElement>
                  <EditableElement
                    id="hero.subtitle"
                    label="Modifier le sous-titre du hero"
                    onEdit={onEdit}
                    className="block"
                    buttonClassName="right-0 -top-3"
                  >
                    {renderRichTextElement(
                      'hero.subtitle',
                      'p',
                      {
                        className: 'hero-subtitle',
                        style: getElementBodyTextStyle('hero.subtitle'),
                      },
                      content.hero.subtitle,
                    )}
                  </EditableElement>
                  <EditableElement
                    id="hero.cta"
                    label="Modifier le bouton d'appel à l'action"
                    onEdit={onEdit}
                    className="inline-flex"
                    buttonClassName="-right-3 -top-3"
                    as="span"
                  >
                    <a href="#" className="hero-cta" style={getElementBackgroundStyle('hero.cta')}>
                      {renderRichTextElement(
                        'hero.cta',
                        'span',
                        {
                          style: getElementTextStyle('hero.cta'),
                        },
                        content.hero.cta,
                      )}
                    </a>
                  </EditableElement>
                </div>
              </div>
            </section>
          </EditableElement>
        </SectionCard>

        <SectionCard zone="about" activeZone={activeZone}>
          <EditableElement
            id="about.style.background"
            label="Modifier le fond de la section À propos"
            onEdit={onEdit}
            className="block"
            buttonClassName="right-4 top-4"
          >
            <section className="section section-surface" style={{ ...aboutBackgroundStyle, ...aboutTextStyle }}>
              <div className="layout-container">
                <EditableElement
                  id="about.title"
                  label="Modifier le titre À propos"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  {renderRichTextElement(
                    'about.title',
                    'h2',
                    {
                      className: 'section-title',
                      style: getElementTextStyle('about.title'),
                    },
                    content.about.title,
                  )}
                </EditableElement>
                <EditableElement
                  id="about.text"
                  label="Modifier le texte À propos"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  <div className="about-text" style={aboutBodyTextStyle}>
                    {renderRichTextElement(
                      'about.text',
                      'p',
                      {
                        className: 'section-text',
                        style: getElementBodyTextStyle('about.text'),
                      },
                      content.about.text,
                    )}
                  </div>
                </EditableElement>
              </div>
            </section>
          </EditableElement>
        </SectionCard>

        <SectionCard zone="menu" activeZone={activeZone}>
          <EditableElement
            id="menu.style.background"
            label="Modifier le fond de la section Menu"
            onEdit={onEdit}
            className="block"
            buttonClassName="right-4 top-4"
          >
            <section className="section section-surface" style={{ ...menuBackgroundStyle, ...menuTextStyle }}>
              <div className="layout-container">
                <EditableElement
                  id="menu.title"
                  label="Modifier le titre du menu"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  {renderRichTextElement(
                    'menu.title',
                    'h2',
                    {
                      className: 'section-title',
                      style: getElementTextStyle('menu.title'),
                    },
                    content.menu.title,
                  )}
                </EditableElement>
                <EditableElement
                  id="menu.description"
                  label="Modifier la description du menu"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  {renderRichTextElement(
                    'menu.description',
                    'p',
                    {
                      className: 'section-text',
                      style: getElementBodyTextStyle('menu.description'),
                    },
                    content.menu.description,
                  )}
                </EditableElement>
                <EditableElement
                  id="menu.bestSellers"
                  label="Modifier la section des meilleurs vendeurs"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  <>
                    <EditableElement
                      id="menu.bestSellersLabel"
                      label="Modifier le libellé des meilleurs vendeurs"
                      onEdit={onEdit}
                      className="block"
                      buttonClassName="right-0 -top-3"
                    >
                      {renderRichTextElement(
                        'menu.bestSellersLabel',
                        'h3',
                        {
                          className: 'section-subtitle',
                          style: getElementTextStyle('menu.bestSellersLabel'),
                        },
                        content.menu.bestSellersLabel,
                      )}
                    </EditableElement>
                    <div className="best-sellers-grid">
                      {bestSellerProducts.map((product) => (
                        <div key={product.id} className="product-card">
                          <img
                            src={product.image ?? content.assets.defaultProductImage}
                            alt={product.name}
                            className="product-card__image"
                          />
                          <div className="product-card__content">
                            <h4 className="product-card__name">{product.name}</h4>
                            <p className="product-card__description">{product.description}</p>
                            <p className="product-card__price">{formatCurrencyCOP(product.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                </EditableElement>
                <EditableElement
                  id="menu.loadingLabel"
                  label="Modifier le libellé de chargement"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  {renderRichTextElement(
                    'menu.loadingLabel',
                    'p',
                    {
                      className: 'section-text section-text--muted',
                      style: getElementBodyTextStyle('menu.loadingLabel'),
                    },
                    content.menu.loadingLabel,
                  )}
                </EditableElement>
              </div>
            </section>
          </EditableElement>
        </SectionCard>

        <SectionCard zone="instagramReviews" activeZone={activeZone}>
          <EditableElement
            id="instagramReviews.style.background"
            label="Modifier le fond de la section Instagram"
            onEdit={onEdit}
            className="block"
            buttonClassName="right-4 top-4"
          >
            <section
              className="section section-surface"
              style={{ ...createBackgroundStyle(content.instagramReviews.style), ...createTextStyle(content.instagramReviews.style) }}
            >
              <div className="layout-container">
                <EditableElement
                  id="instagramReviews.title"
                  label="Modifier le titre de la section Instagram"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  {renderRichTextElement(
                    'instagramReviews.title',
                    'h2',
                    {
                      className: 'section-title',
                      style: getElementTextStyle('instagramReviews.title'),
                    },
                    content.instagramReviews.title,
                  )}
                </EditableElement>
                <div className="instagram-grid">
                  {content.instagramReviews.posts.map((post, index) => (
                    <EditableElement
                      key={post.url}
                      id={`instagramReviews.posts.${index}` as EditableElementKey}
                      label={`Modifier l'avis Instagram ${index + 1}`}
                      onEdit={onEdit}
                      className="block"
                      buttonClassName="-right-2 -top-2"
                    >
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="instagram-post"
                      >
                        <img
                          src={post.thumbnailUrl}
                          alt={`Avis Instagram de ${post.author}`}
                          className="instagram-post__image"
                        />
                        <div className="instagram-post__overlay">
                          <div className="instagram-post__author">@{post.author}</div>
                          <div className="instagram-post__likes">
                            <Star className="h-4 w-4" />
                            <span>{post.likes}</span>
                          </div>
                        </div>
                      </a>
                    </EditableElement>
                  ))}
                </div>
                {isCustomizationMode && content.instagramReviews.posts.length === 0 && (
                  <EditableElement
                    id="instagramReviews.posts"
                    label="Ajouter des avis Instagram"
                    onEdit={onEdit}
                    className="block"
                    buttonClassName="-right-2 -top-2"
                  >
                    <div className="h-64 w-full rounded-xl object-cover shadow-lg" />
                  </EditableElement>
                )}
              </div>
            </section>
          </EditableElement>
        </SectionCard>

        <SectionCard zone="findUs" activeZone={activeZone}>
          <EditableElement
            id="findUs.style.background"
            label="Modifier le fond de la section Encuéntranos"
            onEdit={onEdit}
            className="block"
            buttonClassName="right-4 top-4"
          >
            <section className="find-us-section-new" style={findUsBackgroundStyle}>
              <div className="layout-container">
                <EditableElement
                  id="findUs.title"
                  label="Modifier le titre Encuéntranos"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  {renderRichTextElement(
                    'findUs.title',
                    'h2',
                    {
                      className: 'find-us-title-new',
                      style: getElementTextStyle('findUs.title'),
                    },
                    content.findUs.title,
                  )}
                </EditableElement>
                <div className="find-us-content-new">
                  <div className="find-us-card-wrapper">
                    <div className="find-us-card" style={findUsTextStyle}>
                      {/* Section Direction */}
                      <div className="find-us-info-item">
                        <div className="find-us-icon-circle">
                          <MapPin className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <EditableElement
                            id="findUs.addressLabel"
                            label="Modifier le libellé de l'adresse"
                            onEdit={onEdit}
                            className="block"
                            buttonClassName="right-0 -top-3"
                          >
                            {renderRichTextElement(
                              'findUs.addressLabel',
                              'h3',
                              {
                                className: 'find-us-detail-title',
                                style: getElementTextStyle('findUs.addressLabel'),
                              },
                              content.findUs.addressLabel,
                            )}
                          </EditableElement>
                          <EditableElement
                            id="findUs.address"
                            label="Modifier l'adresse"
                            onEdit={onEdit}
                            className="block"
                            buttonClassName="right-0 -top-3"
                          >
                            {renderRichTextElement(
                              'findUs.address',
                              'p',
                              {
                                className: 'find-us-detail-text',
                                style: getElementBodyTextStyle('findUs.address'),
                              },
                              content.findUs.address,
                            )}
                          </EditableElement>
                        </div>
                      </div>

                      {/* Section Horaires */}
                      <div className="find-us-info-item">
                        <div className="find-us-icon-circle">
                          <Clock className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <EditableElement
                            id="findUs.hoursLabel"
                            label="Modifier le libellé des horaires"
                            onEdit={onEdit}
                            className="block"
                            buttonClassName="right-0 -top-3"
                          >
                            {renderRichTextElement(
                              'findUs.hoursLabel',
                              'h3',
                              {
                                className: 'find-us-detail-title',
                                style: getElementTextStyle('findUs.hoursLabel'),
                              },
                              content.findUs.hoursLabel,
                            )}
                          </EditableElement>
                          <EditableElement
                            id="findUs.hours"
                            label="Modifier les horaires"
                            onEdit={onEdit}
                            className="block"
                            buttonClassName="right-0 -top-3"
                          >
                            {renderRichTextElement(
                              'findUs.hours',
                              'p',
                              {
                                className: 'find-us-detail-text',
                                style: getElementBodyTextStyle('findUs.hours'),
                              },
                              content.findUs.hours,
                            )}
                          </EditableElement>
                        </div>
                      </div>

                      {/* Section Email */}
                      <div className="find-us-info-item">
                        <div className="find-us-icon-circle">
                          <Mail className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <EditableElement
                            id="findUs.cityLabel"
                            label="Modifier le libellé de l'email"
                            onEdit={onEdit}
                            className="block"
                            buttonClassName="right-0 -top-3"
                          >
                            {renderRichTextElement(
                              'findUs.cityLabel',
                              'h3',
                              {
                                className: 'find-us-detail-title',
                                style: getElementTextStyle('findUs.cityLabel'),
                              },
                              content.findUs.cityLabel,
                            )}
                          </EditableElement>
                          <EditableElement
                            id="findUs.city"
                            label="Modifier l'email"
                            onEdit={onEdit}
                            className="block"
                            buttonClassName="right-0 -top-3"
                          >
                            {renderRichTextElement(
                              'findUs.city',
                              'p',
                              {
                                className: 'find-us-detail-text',
                                style: getElementBodyTextStyle('findUs.city'),
                              },
                              content.findUs.city,
                            )}
                          </EditableElement>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Carte Google Maps */}
                  <div className="find-us-card-wrapper">
                    <div className="find-us-map-container">
                      {hasMapLocation ? (
                        <>
                          <iframe
                            title={`Carte Google Maps pour ${findUsMapTitle}`}
                            src={findUsMapEmbedUrl}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            className="find-us-map-iframe"
                          />
                          <a
                            className="find-us-map-button"
                            href={findUsMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <EditableElement
                              id="findUs.mapLabel"
                              label="Modifier le libellé du lien Google Maps"
                              onEdit={onEdit}
                              className="inline-flex"
                              buttonClassName="-right-3 -top-3"
                              as="span"
                            >
                              {renderRichTextElement(
                                'findUs.mapLabel',
                                'span',
                                {
                                  style: getElementBodyTextStyle('findUs.mapLabel'),
                                },
                                content.findUs.mapLabel,
                              )}
                            </EditableElement>
                          </a>
                        </>
                      ) : (
                        <div className="find-us-map-button">
                          <EditableElement
                            id="findUs.mapLabel"
                            label="Modifier le libellé du lien Google Maps"
                            onEdit={onEdit}
                            className="inline-flex"
                            buttonClassName="-right-3 -top-3"
                            as="span"
                          >
                            {renderRichTextElement(
                              'findUs.mapLabel',
                              'span',
                              {
                                style: getElementBodyTextStyle('findUs.mapLabel'),
                              },
                              content.findUs.mapLabel,
                            )}
                          </EditableElement>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </EditableElement>
        </SectionCard>

        <SectionCard zone="footer" activeZone={activeZone}>
          <EditableElement
            id="footer.style.background"
            label="Modifier le fond du pied de page"
            onEdit={onEdit}
            className="block"
            buttonClassName="right-4 top-4"
          >
            <footer className="site-footer" style={{ ...footerBackgroundStyle, ...footerTextStyle }}>
              <div className="layout-container site-footer__inner" style={footerTextStyle}>
                <EditableElement
                  id="footer.text"
                  label="Modifier le texte du pied de page"
                  onEdit={onEdit}
                  className="block"
                  buttonClassName="right-0 -top-3"
                >
                  <p style={getElementBodyTextStyle('footer.text')}>
                    &copy; {new Date().getFullYear()} {content.navigation.brand}.{' '}
                    {renderRichTextElement(
                      'footer.text',
                      'span',
                      {
                        style: getElementBodyTextStyle('footer.text'),
                      },
                      content.footer.text,
                    )}
                  </p>
                </EditableElement>
              </div>
            </footer>
          </EditableElement>
        </SectionCard>
      </div>
    </EditButtonVisibilityContext.Provider>
  );
};

};

export default SitePreviewCanvas;
