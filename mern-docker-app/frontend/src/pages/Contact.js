import React, { useState } from 'react';
import 'boxicons/css/boxicons.min.css';

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
        
        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setSubmitStatus('success');
        setIsSubmitting(false);
        
        // Reset form after successful submission
        setTimeout(() => {
            setFormData({
                name: '',
                email: '',
                subject: '',
                message: '',
                type: 'general'
            });
            setSubmitStatus(null);
        }, 3000);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
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
            icon: 'bx-chat',
            title: 'Live Chat',
            description: 'Instant messaging with our support agents',
            contact: 'Available on website',
            availability: 'Available 24/7'
        },
        {
            icon: 'bx-map',
            title: 'Office Location',
            description: 'Visit us at our headquarters',
            contact: '123 Blockchain Ave, Tech City, TC 12345',
            availability: 'By appointment only'
        }
    ];

    const faqItems = [
        {
            question: 'How do I verify a certificate?',
            answer: 'Simply enter the certificate ID on our verification page or scan the QR code on the certificate. Our system will instantly validate its authenticity using blockchain technology.'
        },
        {
            question: 'Is my data secure?',
            answer: 'Yes, we use military-grade encryption and blockchain technology to ensure your data is completely secure and tamper-proof. We never store sensitive personal information on centralized servers.'
        },
        {
            question: 'How much does it cost?',
            answer: 'We offer flexible pricing plans for institutions. Individual learners can verify certificates for free. Contact our sales team for institutional pricing details.'
        },
        {
            question: 'Can I integrate with my existing system?',
            answer: 'Absolutely! We provide comprehensive APIs and SDKs for easy integration with existing learning management systems and HR platforms.'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black">
            <div className="container mx-auto px-6 py-20">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Get In Touch
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Have questions about our platform? Need help with verification? 
                        We're here to assist you every step of the way.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 mb-20">
                    {/* Contact Form */}
                    <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
                        
                        {submitStatus === 'success' && (
                            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <i className="bx bx-check-circle text-green-400 text-xl"></i>
                                    <span className="text-green-300">Message sent successfully! We'll get back to you soon.</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-gray-300 mb-2">Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                        placeholder="Your full name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 mb-2">Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                        placeholder="your.email@example.com"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-gray-300 mb-2">Inquiry Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                >
                                    <option value="general">General Inquiry</option>
                                    <option value="technical">Technical Support</option>
                                    <option value="sales">Sales & Pricing</option>
                                    <option value="partnership">Partnership</option>
                                    <option value="feedback">Feedback</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-gray-300 mb-2">Subject *</label>
                                <input
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                    placeholder="Brief subject of your message"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-300 mb-2">Message *</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows={6}
                                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors resize-none"
                                    placeholder="Please provide detailed information about your inquiry..."
                                ></textarea>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <i className="bx bx-loader-alt animate-spin"></i>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <i className="bx bx-send"></i>
                                        Send Message
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
                            <div className="space-y-6">
                                {contactMethods.map((method, index) => (
                                    <div key={index} className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <i className={`bx ${method.icon} text-xl text-white`}></i>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1">{method.title}</h3>
                                                <p className="text-gray-300 mb-2">{method.description}</p>
                                                <p className="text-blue-400 font-medium">{method.contact}</p>
                                                <p className="text-gray-400 text-sm">{method.availability}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-white mb-12">Frequently Asked Questions</h2>
                    <div className="max-w-4xl mx-auto space-y-6">
                        {faqItems.map((item, index) => (
                            <div key={index} className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                                <h3 className="text-xl font-bold text-white mb-3">{item.question}</h3>
                                <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-md border border-red-500/30 rounded-2xl p-8 text-center">
                    <i className="bx bx-error-circle text-4xl text-red-400 mb-4"></i>
                    <h3 className="text-2xl font-bold text-white mb-4">Emergency Support</h3>
                    <p className="text-gray-300 mb-6">
                        For critical security issues or urgent technical problems that affect certificate verification
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="tel:+15551234567" className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 justify-center">
                            <i className="bx bx-phone"></i>
                            Emergency Hotline
                        </a>
                        <a href="mailto:emergency@skillcredentialing.com" className="border border-red-500 text-red-300 hover:bg-red-500/10 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 justify-center">
                            <i className="bx bx-envelope"></i>
                            Emergency Email
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;