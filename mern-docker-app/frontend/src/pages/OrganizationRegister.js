import React, { useState } from 'react';
import API_BASE from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const OrganizationRegister = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    organizationName: '',
    industry: '',
    registrationId: '',
    email: '',
    contactNumber: '',
    headOfficeLocation: {
      address: '',
      city: '',
      state: '',
      pincode: ''
    },
    website: '',
    linkedinProfile: '',
    profileDescription: '',
    password: '',
    confirmPassword: '',
    contactPerson: {
      name: '',
      designation: '',
      email: '',
      phone: ''
    }
  });

  const [hiringRequirements, setHiringRequirements] = useState([{
    skillSets: [],
    numberOfPositions: 1,
    minimumQualification: '',
    experienceLevel: 'Fresher',
    technicalSkills: [],
    softSkills: [],
    jobType: 'Full-time',
    jobTitle: '',
    salaryRange: { min: '', max: '', currency: 'INR' }
  }]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const industryOptions = [
    'Information Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce',
    'Manufacturing', 'Consulting', 'Media & Entertainment', 'Real Estate',
    'Automotive', 'Telecommunications', 'Banking', 'Insurance', 'Retail'
  ];

  const steps = [
    { number: 1, title: t('companyInformation'), icon: '🏢' },
    { number: 2, title: t('locationContact'), icon: '📍' },
    { number: 3, title: t('hiringRequirements'), icon: '💼' },
    { number: 4, title: t('authentication'), icon: '🔐' }
  ];

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return formData.organizationName && formData.industry && formData.registrationId && formData.email;
      case 2:
        return formData.headOfficeLocation.address && formData.headOfficeLocation.city && formData.headOfficeLocation.state;
      case 3:
        return hiringRequirements.every(req => req.jobTitle && req.numberOfPositions > 0);
      case 4:
        return formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
      default:
        return true;
    }
  };

  const handleInputChange = (e, section = null, index = null) => {
    const { name, value } = e.target;
    
    if (section === 'hiringRequirements') {
      const updatedRequirements = [...hiringRequirements];
      if (name === 'skillSets' || name === 'technicalSkills' || name === 'softSkills') {
        updatedRequirements[index][name] = value.split(',').map(s => s.trim());
      } else if (name.startsWith('salaryRange.')) {
        const field = name.split('.')[1];
        updatedRequirements[index].salaryRange[field] = value;
      } else {
        updatedRequirements[index][name] = value;
      }
      setHiringRequirements(updatedRequirements);
    } else if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addHiringRequirement = () => {
    setHiringRequirements([...hiringRequirements, {
      skillSets: [],
      numberOfPositions: 1,
      minimumQualification: '',
      experienceLevel: 'Fresher',
      technicalSkills: [],
      softSkills: [],
      jobType: 'Full-time',
      jobTitle: '',
      salaryRange: { min: '', max: '', currency: 'INR' }
    }]);
  };

  const removeHiringRequirement = (index) => {
    if (hiringRequirements.length > 1) {
      const updated = hiringRequirements.filter((_, i) => i !== index);
      setHiringRequirements(updated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError(t('passwordTooShort'));
      setLoading(false);
      return;
    }

    try {
      const registrationData = {
        ...formData,
        hiringRequirements
      };
      delete registrationData.confirmPassword;

      const response = await fetch(`${API_BASE}/api/organization/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t('registrationSuccessful'));
        // Store token if you want to auto-login
        if (data.token) {
          localStorage.setItem('orgToken', data.token);
          localStorage.setItem('organization', JSON.stringify(data.organization));
        }
      } else {
        setError(data.message || t('registrationFailed'));
      }
    } catch (err) {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('organizationRegistration')}
            </h1>
            <p className="text-gray-600 mt-2">{t('createOrganizationAccount')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 overflow-x-auto pb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  currentStep >= step.number 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                    : 'bg-white text-gray-500 border-2 border-gray-200'
                }`}>
                  <span className="text-xl">{step.icon}</span>
                  <div className="text-sm font-medium hidden sm:block">
                    <div>{t('step')} {step.number}</div>
                    <div className="text-xs opacity-80">{step.title}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-1 mx-2 rounded-full transition-all duration-300 ${
                    currentStep > step.number ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-green-700 font-medium">{success}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8">
            {/* Step Content */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center space-x-2">
                    <span className="text-3xl">🏢</span>
                    <span>{t('companyInformation')}</span>
                  </h2>
                  <p className="text-gray-600 mt-2">{t('tellUsAboutOrganization')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('organizationName')} *
                    </label>
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleInputChange}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                      placeholder={t('enterOrganizationName')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('industry')} *
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                      required
                    >
                      <option value="">{t('selectIndustry')}</option>
                      {industryOptions.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('registrationId')} *
                    </label>
                    <input
                      type="text"
                      name="registrationId"
                      value={formData.registrationId}
                      onChange={handleInputChange}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                      placeholder={t('companyRegistrationNumber')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('officialEmail')} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                      placeholder="organization@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('contactNumber')} *
                    </label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                      placeholder="+91 9876543210"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('website')}
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                      placeholder="https://www.example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t('companyDescription')}
                  </label>
                  <textarea
                    name="profileDescription"
                    value={formData.profileDescription}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none text-gray-800"
                    placeholder={t('briefDescription')}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Location & Contact */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center space-x-2">
                    <span className="text-3xl">📍</span>
                    <span>{t('locationContactDetails')}</span>
                  </h2>
                  <p className="text-gray-600 mt-2">{t('whereLocated')}</p>
                </div>

                {/* Head Office Location */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <span>🏢</span>
                    <span>{t('headOfficeLocation')}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('address')} *
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.headOfficeLocation.address}
                        onChange={(e) => handleInputChange(e, 'headOfficeLocation')}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder={t('buildingName')}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('city')} *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.headOfficeLocation.city}
                        onChange={(e) => handleInputChange(e, 'headOfficeLocation')}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder={t('cityName')}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('state')} *
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.headOfficeLocation.state}
                        onChange={(e) => handleInputChange(e, 'headOfficeLocation')}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder={t('stateName')}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('pincode')}
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.headOfficeLocation.pincode}
                        onChange={(e) => handleInputChange(e, 'headOfficeLocation')}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder="123456"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Person */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <span>👤</span>
                    <span>{t('primaryContactPerson')}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('fullName')} *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.contactPerson.name}
                        onChange={(e) => handleInputChange(e, 'contactPerson')}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder={t('contactPersonName')}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('designation')} *
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.contactPerson.designation}
                        onChange={(e) => handleInputChange(e, 'contactPerson')}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder={t('hrManager')}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('email')} *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.contactPerson.email}
                        onChange={(e) => handleInputChange(e, 'contactPerson')}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder="contact@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('phone')}
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.contactPerson.phone}
                        onChange={(e) => handleInputChange(e, 'contactPerson')}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Hiring Requirements */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center space-x-2">
                    <span className="text-3xl">💼</span>
                    <span>{t('hiringRequirements')}</span>
                  </h2>
                  <p className="text-gray-600 mt-2">{t('whatTalent')}</p>
                </div>

                {hiringRequirements.map((requirement, index) => (
                  <div key={index} className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{t('position')} #{index + 1}</h3>
                      {hiringRequirements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHiringRequirement(index)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          {t('jobTitle')} *
                        </label>
                        <input
                          type="text"
                          name="jobTitle"
                          value={requirement.jobTitle}
                          onChange={(e) => handleInputChange(e, 'hiringRequirements', index)}
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                          placeholder={t('softwareDeveloper')}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          {t('numberOfPositions')} *
                        </label>
                        <input
                          type="number"
                          name="numberOfPositions"
                          value={requirement.numberOfPositions}
                          onChange={(e) => handleInputChange(e, 'hiringRequirements', index)}
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                          min="1"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          {t('experienceLevel')}
                        </label>
                        <select
                          name="experienceLevel"
                          value={requirement.experienceLevel}
                          onChange={(e) => handleInputChange(e, 'hiringRequirements', index)}
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        >
                          <option value="Fresher">{t('fresher')}</option>
                          <option value="Junior (1-2 years)">{t('junior')}</option>
                          <option value="Mid-level (2-5 years)">{t('midLevel')}</option>
                          <option value="Senior (5+ years)">{t('senior')}</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          {t('jobType')}
                        </label>
                        <select
                          name="jobType"
                          value={requirement.jobType}
                          onChange={(e) => handleInputChange(e, 'hiringRequirements', index)}
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        >
                          <option value="Full-time">{t('fullTime')}</option>
                          <option value="Part-time">{t('partTime')}</option>
                          <option value="Contract">{t('contract')}</option>
                          <option value="Internship">{t('internship')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={addHiringRequirement}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>{t('addAnotherPosition')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Authentication */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center space-x-2">
                    <span className="text-3xl">🔐</span>
                    <span>{t('createAccount')}</span>
                  </h2>
                  <p className="text-gray-600 mt-2">{t('setupLoginCredentials')}</p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-xl border border-purple-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('password')} *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder={t('createStrongPassword')}
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-gray-500">{t('minPasswordLength')}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('confirmPassword')} *
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-800"
                        placeholder={t('confirmYourPassword')}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{t('passwordsDoNotMatch')}</p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">📋 {t('registrationSummary')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>{t('organization')}:</strong> {formData.organizationName || t('notSet')}
                    </div>
                    <div>
                      <strong>{t('industry')}:</strong> {formData.industry || t('notSet')}
                    </div>
                    <div>
                      <strong>{t('location')}:</strong> {formData.headOfficeLocation.city ? `${formData.headOfficeLocation.city}, ${formData.headOfficeLocation.state}` : t('notSet')}
                    </div>
                    <div>
                      <strong>{t('contact')}:</strong> {formData.contactPerson.name || t('notSet')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-8 border-t border-gray-200">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>{t('previous')}</span>
                </button>
              )}

              <div className="flex-1" />

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateStep()}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
                >
                  <span>{t('continue')}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !validateStep()}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{t('creatingAccount')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('createOrganizationAccount')}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            {t('alreadyHaveAccount')}{' '}
            <button
              type="button"
              onClick={() => window.location.href = '/organization/login'}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
            >
              {t('signInHere')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizationRegister;