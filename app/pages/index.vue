<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <!-- Hero Section -->
      <section class="text-center mb-16">
        <h1 class="text-5xl font-bold text-gray-900 mb-6">
          Vahan Email Platform
        </h1>
        <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Professional email infrastructure powered by AWS SES. Set up custom domain email addresses, 
          manage mailboxes, and send emails with enterprise-grade reliability.
        </p>
        <div class="flex gap-4 justify-center">
          <UButton 
            to="/auth/register" 
            size="lg" 
            class="px-8"
          >
            Get Started
          </UButton>
          <UButton 
            to="/auth/login" 
            variant="outline" 
            size="lg" 
            class="px-8"
          >
            Sign In
          </UButton>
        </div>
      </section>

      <!-- Features Section -->
      <section class="grid md:grid-cols-3 gap-8 mb-16">
        <div class="text-center p-6 bg-white rounded-lg shadow-sm">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-envelope" class="w-6 h-6 text-blue-600" />
          </div>
          <h3 class="text-lg font-semibold mb-2">Custom Domain Email</h3>
          <p class="text-gray-600">
            Create professional email addresses using your own domain with automated DNS setup.
          </p>
        </div>

        <div class="text-center p-6 bg-white rounded-lg shadow-sm">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-green-600" />
          </div>
          <h3 class="text-lg font-semibold mb-2">AWS SES Integration</h3>
          <p class="text-gray-600">
            Powered by Amazon SES for high deliverability, scalability, and cost-effectiveness.
          </p>
        </div>

        <div class="text-center p-6 bg-white rounded-lg shadow-sm">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-cog-6-tooth" class="w-6 h-6 text-purple-600" />
          </div>
          <h3 class="text-lg font-semibold mb-2">Easy Management</h3>
          <p class="text-gray-600">
            Intuitive dashboard to manage domains, mailboxes, and email settings all in one place.
          </p>
        </div>
      </section>

      <!-- How it Works Section -->
      <section class="mb-16">
        <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div class="grid md:grid-cols-4 gap-8">
          <div class="text-center">
            <div class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              1
            </div>
            <h4 class="font-semibold mb-2">Connect AWS</h4>
            <p class="text-sm text-gray-600">Securely provide your AWS credentials for SES access</p>
          </div>
          
          <div class="text-center">
            <div class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              2
            </div>
            <h4 class="font-semibold mb-2">Add Domain</h4>
            <p class="text-sm text-gray-600">Register your custom domain and verify ownership</p>
          </div>
          
          <div class="text-center">
            <div class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              3
            </div>
            <h4 class="font-semibold mb-2">Configure DNS</h4>
            <p class="text-sm text-gray-600">Set up DNS records for email delivery and authentication</p>
          </div>
          
          <div class="text-center">
            <div class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              4
            </div>
            <h4 class="font-semibold mb-2">Start Sending</h4>
            <p class="text-sm text-gray-600">Create mailboxes and start sending professional emails</p>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="text-center bg-blue-50 p-8 rounded-lg">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">
          Ready to Get Started?
        </h2>
        <p class="text-gray-600 mb-6">
          Set up your professional email infrastructure in minutes.
        </p>
        <UButton 
          to="/auth/register" 
          size="lg"
          class="px-8"
        >
          Create Your Account
        </UButton>
      </section>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: 'Vahan Email Platform - Professional Email Infrastructure',
  meta: [
    { 
      name: 'description', 
      content: 'Professional email infrastructure powered by AWS SES. Set up custom domain email addresses with enterprise-grade reliability.' 
    }
  ]
})
</script>
