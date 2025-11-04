import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import styles from "./Footer.module.css";

const BRAND = "Studio AR";
const OWNER = "Ibeth Rentería";
const DESCRIPTION =
  "Lashista profesional y Master Trainer desde 2021. Formación y servicios especializados en extensiones de pestañas con un enfoque en excelencia, calidad y crecimiento para cada artista.";
const SERVICES = [
  "Extensiones de Pestañas",
  "Capacitaciones Profesionales",
  "Diseño y Cuidado de Pestañas",
  "Asesorías Personalizadas",
];
const PHONE_DISPLAY = "+52 1 665 110 5558";
const PHONE_TEL = "tel:+5216651105558";
const WHATSAPP_URL = "https://wa.me/526651105558";
const WHATSAPP_TEXT = "https://wa.me/526651105558?text=Hola%2C%20quiero%20más%20información%20sobre%20sus%20servicios";
const EMAIL = "ibeth.zare30@gmail.com";
const ADDRESS = "Av. Miguel Hidalgo 281, Local 2, Zona Centro, 21400 Tecate, B.C.";
const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Av.+Miguel+Hidalgo+281,+Local+2,+Zona+Centro,+21400+Tecate,+B.C.";
const INSTAGRAM_HANDLE = "@studio__arrr";
const INSTAGRAM_URL = "https://www.instagram.com/studio__arrr/";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.columns}>
          <div className={styles.brandColumn}>
            <div>
              <h3 className={styles.brandTitle}>{BRAND}</h3>
              <p className={styles.brandSubtitle}>{OWNER}</p>
              <div className={styles.brandDivider} />
            </div>
            <p className={styles.brandDescription}>{DESCRIPTION}</p>
            <div className={styles.socialLinks}>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visitar Instagram oficial de Studio AR"
                className={styles.socialButton}
              >
                <Instagram className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href={WHATSAPP_TEXT}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir chat de WhatsApp con Studio AR"
                className={styles.socialButton}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.051 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.869 9.869 0 01-1.51-5.26c.001-5.441 4.437-9.875 9.889-9.875 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className={styles.columnTitle}>Nuestros Servicios</h4>
            <ul className={styles.list}>
              {SERVICES.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>

          <div className={styles.contactColumn}>
            <h4 className={styles.columnTitle}>Contacto Directo</h4>
            <div className={styles.contactDetails}>
              <div className={styles.contactInfo}>
                <span className={styles.iconCircle}>
                  <Phone className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className={styles.contactText}>
                  <a href={PHONE_TEL} className={styles.link}>
                    {PHONE_DISPLAY}
                  </a>
                  <span className={styles.contactLabel}>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                      WhatsApp disponible
                    </a>
                  </span>
                </div>
              </div>

              <div className={styles.contactInfo}>
                <span className={styles.iconCircle}>
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className={styles.contactText}>
                  <a href={`mailto:${EMAIL}`} className={styles.link}>
                    {EMAIL}
                  </a>
                  <span className={styles.contactLabel}>Respuesta en 24h</span>
                </div>
              </div>

              <div className={styles.contactInfo}>
                <span className={styles.iconCircle}>
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className={styles.contactText}>
                  <span>{ADDRESS}</span>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.inlineLink}
                  >
                    Ver en mapa
                  </a>
                </div>
              </div>

              <div className={styles.contactInfo}>
                <span className={styles.iconCircle}>
                  <Instagram className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className={styles.contactText}>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    {INSTAGRAM_HANDLE}
                  </a>
                  <span className={styles.contactLabel}>Instagram oficial</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.legalBar}>
          <div>
            © {year} {BRAND} — {OWNER}
          </div>
          <nav aria-label="Enlaces legales" className={styles.legalLinks}>
            {/* TODO: Reemplazar enlaces con rutas reales cuando estén disponibles */}
            <a href="#" className={styles.link}>
              Política de Privacidad
            </a>
            <a href="#" className={styles.link}>
              Términos de Servicio
            </a>
          </nav>
          <div className={styles.legalInfo}>
            <span>Certificada por el CONOCER</span>
            <span className={styles.dot} aria-hidden="true" />
            <span>Hecho con ♥</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
