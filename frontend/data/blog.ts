// This is a mock implementation - in a real app, you would fetch from a database
// or content management system

export interface Article {
  slug: string;
  title: string;
  date: string;
  summary: string;
  image: string;
  tags: string[];
  readingTime: number;
  content: string;
}

// Sample articles data
const articles: Article[] = [
  {
    slug: 'understanding-anxiety',
    title: 'Understanding Anxiety: Causes, Symptoms, and Coping Strategies',
    date: '2023-04-15',
    summary:
      'Anxiety is one of the most common mental health conditions. Learn about its causes, how to recognize symptoms, and effective strategies to manage it.',
    image: '/placeholder.svg?height=600&width=800',
    tags: ['Anxiety', 'Mental Disorders', 'Treatments', 'Well-being'],
    readingTime: 8,
    content: `
  # Understanding Anxiety
  
  Anxiety is a normal and often healthy emotion. However, when a person regularly feels disproportionate levels of anxiety, it might become a medical disorder.
  
  ## What Causes Anxiety?
  
  Anxiety disorders can be caused by a complex set of risk factors:
  
  - **Genetics**: Family history plays a role in increasing the likelihood of developing anxiety disorders.
  - **Brain chemistry**: Psychologists believe that many anxiety disorders result from disrupted brain circuits that control fear and emotions.
  - **Environmental factors**: Traumatic events, stress from a serious illness, or major life changes can trigger anxiety disorders.
  - **Personality**: People with certain personality types are more prone to anxiety disorders.
  
  ## Common Symptoms
  
  Anxiety manifests differently in different people, but common symptoms include:
  
  ### Physical Symptoms
  - Increased heart rate
  - Rapid breathing
  - Restlessness
  - Trouble concentrating
  - Difficulty falling asleep
  
  ### Psychological Symptoms
  - Feelings of danger, panic, or dread
  - Obsessive thoughts
  - Nightmares
  - Uncontrollable, unwanted thoughts
  - Ritualistic behaviors
  
  ## Effective Coping Strategies
  
  There are several strategies that can help manage anxiety:
  
  1. **Mindfulness and meditation**: Practices that bring you back to the present moment can reduce anxiety about the future.
  2. **Regular physical activity**: Exercise can help reduce stress and improve your mood through the release of endorphins.
  3. **Healthy sleep habits**: Prioritize getting enough quality sleep each night.
  4. **Balanced diet**: Reduce caffeine and alcohol, which can trigger or worsen anxiety.
  5. **Deep breathing exercises**: Controlled breathing can help reduce anxiety symptoms in the moment.
  
  > "Anxiety does not empty tomorrow of its sorrows, but only empties today of its strength." — Charles Spurgeon
  
  ## When to Seek Professional Help
  
  If anxiety is affecting your daily life, relationships, or ability to work, it's important to seek professional help. Treatment options include:
  
  - **Therapy**: Cognitive-behavioral therapy (CBT) is particularly effective for anxiety disorders.
  - **Medication**: Anti-anxiety medications can help manage symptoms.
  - **Support groups**: Connecting with others who understand what you're going through can be beneficial.
  
  Remember, seeking help is a sign of strength, not weakness. With proper support and treatment, you can learn to manage anxiety effectively.
      `,
  },
  {
    slug: 'importance-of-sleep',
    title: 'The Importance of Sleep for Mental Health',
    date: '2023-05-22',
    summary:
      'Sleep plays a crucial role in maintaining good mental health. Discover why quality sleep matters and how to improve your sleep habits.',
    image: '/placeholder.svg?height=600&width=800',
    tags: ['Sleep', 'Well-being', 'Physical Health', 'Routine'],
    readingTime: 6,
    content: `
  # The Importance of Sleep for Mental Health
  
  Sleep is essential for our physical and mental well-being. Despite this, many people don't get enough quality sleep, which can have significant impacts on mental health.
  
  ## How Sleep Affects Mental Health
  
  Sleep and mental health are closely connected. Sleep deprivation affects your psychological state and mental health. Those with mental health problems are more likely to have insomnia or other sleep disorders. And those with sleep disorders often develop mental health problems.
  
  ## Common Sleep Issues
  
  Several sleep issues can impact mental health:
  
  - **Insomnia**: Difficulty falling or staying asleep
  - **Sleep apnea**: Breathing interruptions during sleep
  - **Restless leg syndrome**: Uncomfortable sensations causing an urge to move the legs
  - **Circadian rhythm disorders**: Problems with the timing of sleep
  
  ## How Poor Sleep Affects Mental Health
  
  Poor sleep can contribute to the development and worsening of mental health problems:
  
  1. **Depression**: Sleep problems may increase the risk of developing depression and can make existing depression worse.
  2. **Anxiety**: Sleep deprivation can trigger anxiety and make it harder to cope with stressors.
  3. **Bipolar disorder**: Sleep disturbances can trigger manic episodes.
  4. **ADHD**: Sleep problems can worsen attention and concentration difficulties.
  
  ## Tips for Better Sleep
  
  Improving your sleep habits can have a positive impact on your mental health:
  
  ### Create a Sleep-Friendly Environment
  - Keep your bedroom dark, quiet, and cool
  - Use your bed only for sleep and intimacy
  - Remove electronic devices from your bedroom
  
  ### Establish a Routine
  - Go to bed and wake up at the same time every day
  - Create a relaxing bedtime routine
  - Avoid naps, especially in the afternoon
  
  ### Watch What You Consume
  - Limit caffeine and alcohol, especially before bedtime
  - Avoid large meals before bed
  - Stay hydrated throughout the day
  
  > "Sleep is the golden chain that ties health and our bodies together." — Thomas Dekker
  
  ## When to Seek Help
  
  If you've tried improving your sleep habits but still struggle with sleep issues, it may be time to talk to a healthcare provider. They can help determine if you have a sleep disorder and recommend appropriate treatment.
  
  Remember that investing in better sleep is investing in your mental health.
      `,
  },
  {
    slug: 'mindfulness-for-beginners',
    title: 'Mindfulness for Beginners: Simple Practices for Daily Life',
    date: '2023-06-10',
    summary:
      'Discover how mindfulness can help reduce stress and improve your mental well-being with these simple practices you can incorporate into your daily routine.',
    image: '/placeholder.svg?height=600&width=800',
    tags: ['Mindfulness', 'Well-being', 'Stress Management', 'Routine'],
    readingTime: 7,
    content: `
  # Mindfulness for Beginners
  
  Mindfulness is the practice of purposely focusing your attention on the present moment—and accepting it without judgment. It's a simple concept, but becoming more mindful takes practice.
  
  ## What is Mindfulness?
  
  Mindfulness involves being fully present in the moment, aware of where you are and what you're doing, and not overly reactive or overwhelmed by what's going on around you.
  
  When you practice mindfulness, you're training your attention to observe your thoughts, feelings, and sensations without judgment. This helps you develop a greater awareness of your experiences.
  
  ## Benefits of Mindfulness
  
  Research has shown that mindfulness practices can provide numerous benefits:
  
  - **Reduced stress and anxiety**
  - **Improved focus and concentration**
  - **Better emotional regulation**
  - **Enhanced self-awareness**
  - **Improved sleep quality**
  - **Decreased depression symptoms**
  
  ## Simple Mindfulness Practices
  
  You don't need special equipment or a lot of time to practice mindfulness. Here are some simple practices to get started:
  
  ### Mindful Breathing (5 minutes)
  
  1. Sit comfortably with your back straight but not stiff
  2. Close your eyes or lower your gaze
  3. Focus your attention on your breath
  4. Notice the sensation of air moving in and out of your body
  5. When your mind wanders, gently bring your attention back to your breath
  
  ### Body Scan (10 minutes)
  
  1. Lie down or sit comfortably
  2. Close your eyes and take a few deep breaths
  3. Bring your attention to your feet, noticing any sensations
  4. Slowly move your attention up through your body—legs, torso, arms, and head
  5. Notice any sensations, tension, or discomfort without trying to change anything
  
  ### Mindful Walking (10-15 minutes)
  
  1. Find a quiet place where you can walk slowly
  2. Pay attention to the lifting, moving, and placing of each foot
  3. Notice the sensations in your feet and legs
  4. When your mind wanders, bring your attention back to the walking
  
  ## Incorporating Mindfulness into Daily Life
  
  You can practice mindfulness throughout your day:
  
  - **Mindful eating**: Pay full attention to the experience of eating
  - **Mindful listening**: Give your complete attention when someone is speaking
  - **Mindful observation**: Take time to notice details in your environment
  - **Mindful waiting**: Use waiting time (in line, at traffic lights) to practice mindfulness
  
  > "The present moment is the only time over which we have dominion." — Thich Nhat Hanh
  
  ## Starting Your Mindfulness Journey
  
  Remember that mindfulness is a skill that develops with practice. Start with just a few minutes each day and gradually increase the time as you become more comfortable with the practice.
  
  Be patient with yourself and approach mindfulness with curiosity rather than judgment. Every moment is an opportunity to begin again.
      `,
  },
];

export async function getAllArticles(): Promise<Article[]> {
  // Sort articles by date (newest first)
  return [...articles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  return articles.find((article) => article.slug === slug);
}

export async function getArticlesByTag(tag: string): Promise<Article[]> {
  return articles.filter((article) => article.tags.includes(tag));
}

export async function searchArticles(query: string): Promise<Article[]> {
  const lowercaseQuery = query.toLowerCase();
  return articles.filter(
    (article) =>
      article.title.toLowerCase().includes(lowercaseQuery) ||
      article.summary.toLowerCase().includes(lowercaseQuery) ||
      article.content.toLowerCase().includes(lowercaseQuery),
  );
}
