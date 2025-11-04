import { Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import styles from "./Footer.module.css";

const WHATSAPP_LINK = "https://wa.me/5216651105558?text=Hola%20Ibeth%2C%20quiero%20agendar%20una%20cita";
const INSTAGRAM_LINK = "https://www.instagram.com/studio__arrr/";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          <div className={styles.brandColumn}>
            <h2 className={`font-heading ${styles.brandTitle}`}>
              Studio AR
            </h2>
            <p className={`font-body ${styles.brandSubtitle}`}>
              Ibeth Rentería
            </p>
            <p className={`font-body ${styles.brandDescription}`}>
              Estudio boutique especializado en extensiones de pestañas premium y formación de nuevas artistas con estándares internacionales.
            </p>
            <div className={styles.socialLinks}>
              <a
                href={INSTAGRAM_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram oficial de Studio AR"
                className={styles.socialLink}
              >
                <Instagram aria-hidden="true" />
              </a>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contactar a Studio AR por WhatsApp"
                className={styles.socialLink}
              >
                <MessageCircle aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className={styles.servicesColumn}>
            <h2 className={`font-heading ${styles.columnTitle}`}>
              Nuestros Servicios
            </h2>
            <ul className={styles.linkList}>
              <li>Extensiones de Pestañas</li>
              <li>Capacitaciones Profesionales</li>
              <li>Diseño y Cuidado de Pestañas</li>
              <li>Asesorías Personalizadas</li>
            </ul>
          </div>

          <div className={styles.contactColumn}>
            <h2 className={`font-heading ${styles.columnTitle}`}>
              Contacto Directo
            </h2>
            <ul className={styles.contactList}>
              <li>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactLink}
                >
                  <MessageCircle aria-hidden="true" />
                  <span>+52 1 665 110 5558 (WhatsApp)</span>
                </a>
              </li>
              <li>
                <a href="tel:+5216651105558" className={styles.contactLink}>
                  <Phone aria-hidden="true" />
                  <span>+52 1 665 110 5558</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:ibeth.zare30@gmail.com"
                  className={styles.contactLink}
                >
                  <Mail aria-hidden="true" />
                  <span>ibeth.zare30@gmail.com</span>
                </a>
              </li>
              <li>
                <div className={styles.contactLink}>
                  <MapPin aria-hidden="true" />
                  <span>Av. Miguel Hidalgo 281, Local 2 · Tecate, Baja California</span>
                </div>
              </li>
              <li>
                <a
                  href={INSTAGRAM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactLink}
                >
                  <Instagram aria-hidden="true" />
                  <span>@studio__arrr</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.legalGroup}>
            <span className={styles.copyright}>© 2025 Studio AR — Ibeth Rentería</span>
            <nav aria-label="Enlaces legales" className={styles.legalNav}>
              <a href="#TODO-privacy">Política de Privacidad</a>
              <a href="#TODO-terms">Términos de Servicio</a>
            </nav>
          </div>
          <div className={styles.certificationGroup}>
            <span>Certificada por el CONOCER</span>
            <span className={styles.madeWithLove}>
              Hecho con <span aria-hidden="true">♥</span>
              <span className="sr-only">amor</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
