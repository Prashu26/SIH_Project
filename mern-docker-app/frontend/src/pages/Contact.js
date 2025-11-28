import React, { useState } from 'react';
import 'boxicons/css/boxicons.min.css';

// Replace heroImage with your own file in /src/assets and update the import path
const heroImage = '/assets/hero-team.jpg'; // <-- change this to your image

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // simulate submit
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitStatus('success');
    setIsSubmitting(false);

    setTimeout(() => {
      setFormData({ name: '', email: '', subject: '', message: '', type: 'general' });
      setSubmitStatus(null);
    }, 2500);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const contactMethods = [
    {
      icon: 'bx-envelope',
      title: 'Email Support',
      description: 'Get help with technical issues or general inquiries',
      contact: 'support@skillcredentialing.com',
      availability: 'Response within 24 hours'
    },
    {
      icon: 'bx-phone',
      title: 'Phone Support',
      description: 'Speak directly with our support team',
      contact: '+1 (555) 123-4567',
      availability: 'Mon-Fri, 9 AM - 6 PM EST'
    },
    {
      icon: 'bx-map',
      title: 'Office Location',
      description: 'Visit us at our headquarters',
      contact: '123 Blockchain Ave, Tech City',
      availability: 'By appointment'
    }
  ];

  const faqItems = [
    {
      question: 'How do I verify a certificate?',
      answer: 'Enter the certificate ID on the verification page or upload the PDF. Our system will validate authenticity.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes — we use encryption and secure storage. Sensitive data is not stored in plain text.'
    }
  ];

  // sample team data (use your images)
  const team = [
    { name: 'Neil Kevin Martis', title: 'Co-founder', img: 'https://i.pravatar.cc/300?img=32' },
    { name: 'Shesha Vishnu Prasad', title: 'CTO', img: 'https://i.pravatar.cc/300?img=12' },
    { name: 'Neelu Khatri', title: 'Operations', img: 'https://i.pravatar.cc/300?img=52' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black text-white">
      {/* HERO with background image */}
      <header className="relative h-[46vh] lg:h-[56vh]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
            filter: 'saturate(0.9) contrast(1.02)'
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-700/50 to-black/60" />
        <div className="relative z-10 container mx-auto px-6 h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4">
              Our powerhouse team of experts and supporters
            </h1>
            <p className="text-lg text-gray-200 max-w-xl">
              Have questions? Need help with verification or integration — reach out and we’ll respond quickly.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Contact form + quick methods */}
        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Form */}
          <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Send us a Message</h2>

            {submitStatus === 'success' && (
              <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <i className="bx bx-check-circle text-green-400 text-xl"></i>
                  <span className="text-green-300">Message sent successfully! We'll get back to you soon.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                  className="w-full bg-gray-700/30 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-400"
                />
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  type="email"
                  placeholder="you@example.com"
                  className="w-full bg-gray-700/30 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-400"
                />
              </div>

              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full bg-gray-700/30 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-400"
              >
                <option value="general">General Inquiry</option>
                <option value="technical">Technical Support</option>
                <option value="sales">Sales</option>
              </select>

              <input
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder="Subject"
                className="w-full bg-gray-700/30 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-400"
              />

              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Your message..."
                className="w-full bg-gray-700/30 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-400 resize-none"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-3 rounded-lg font-semibold flex items-center justify-center gap-3"
              >
                {isSubmitting ? <i className="bx bx-loader-alt animate-spin"></i> : <i className="bx bx-send"></i>}
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact methods & small CTA */}
          <div className="space-y-6">
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Contact Information</h3>
              <div className="grid gap-4">
                {contactMethods.map((m, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-12 h-12 rounded-lg flex items-center justify-center">
                      <i className={`bx ${m.icon} text-white text-lg`}></i>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{m.title}</div>
                      <div className="text-gray-300">{m.description}</div>
                      <div className="text-blue-300 mt-1 font-medium">{m.contact}</div>
                      <div className="text-gray-400 text-sm mt-1">{m.availability}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-600/10 to-orange-600/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 text-center">
              <h4 className="text-lg font-bold mb-2">Emergency Support</h4>
              <p className="text-gray-300 mb-4">For urgent issues affecting verification, contact the hotline.</p>
              <div className="flex items-center justify-center gap-3">
                <a href="tel:+15551234567" className="bg-red-600 text-white px-4 py-2 rounded-lg">Call Hotline</a>
                <a href="mailto:emergency@skillcredentialing.com" className="border border-red-500 text-red-300 px-4 py-2 rounded-lg">Email</a>
              </div>
            </div>
          </div>
        </div>

        {/* Team section (matches screenshot style) */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Our team</h2>
          <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <div key={idx} className="text-center">
                <div className="w-48 h-48 mx-auto rounded-lg overflow-hidden border-4 border-purple-600/80">
                  <img src={member.img} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <div className="mt-4 bg-white/5 p-3 rounded">
                  <div className="font-semibold text-white">{member.name}</div>
                  <div className="text-sm text-gray-300">{member.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto space-y-4">
            {faqItems.map((item, i) => (
              <div key={i} className="bg-gray-800/40 backdrop-blur-md border border-gray-700 rounded-2xl p-6">
                <h4 className="font-bold text-white mb-2">{item.question}</h4>
                <p className="text-gray-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Contact;