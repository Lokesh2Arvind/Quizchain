// Question Service - Fetch and manage quiz questions from Aptitude API

const axios = require('axios');

const APTITUDE_API_BASE = process.env.APTITUDE_API_BASE || 'https://aptitude-api.vercel.app';

class QuestionService {
  constructor() {
    this.apiBase = APTITUDE_API_BASE;
  }

  /**
   * Fetch questions based on topic
   * @param {string} topic - 'Age', 'Mixture', 'Random', 'All', etc.
   * @param {number} count - Number of questions to fetch (default: 10)
   * @returns {Promise<Array>} - Array of formatted questions
   */
  async fetchQuestions(topic, count = 5) {
    try {
      console.log(`📚 Fetching ${count} questions for topic: ${topic}`);

      let questions = [];

      if (topic === 'Random') {
        // Fetch random mix from all topics
        questions = await this.fetchRandomMix(count);
      } else if (topic === 'All') {
        // Fetch from all topics evenly
        questions = await this.fetchAllTopics(count);
      } else {
        // Fetch from specific topic
        questions = await this.fetchFromTopic(topic, count);
      }

      // Format and validate questions
      const formattedQuestions = questions.map((q, index) => this.formatQuestion(q, index));
      
      console.log(`✅ Successfully fetched ${formattedQuestions.length} questions`);
      return formattedQuestions;

    } catch (error) {
      console.error('❌ Error fetching questions:', error.message);
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }
  }

  /**
   * Fetch questions from a specific topic
   * @param {string} topic 
   * @param {number} count 
   * @returns {Promise<Array>}
   */
  async fetchFromTopic(topic, count) {
    try {
      // API returns ONE question per request, so make multiple requests IN PARALLEL
      const url = `${this.apiBase}/${encodeURIComponent(topic)}`;
      console.log(`🔗 Fetching ${count} questions from ${topic} in parallel...`);
      
      // Create array of promises for parallel execution
      const promises = Array(count).fill(null).map((_, i) => 
        axios.get(url, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Accept': 'application/json'
          }
        }).then(response => {
          if (!response.data) {
            throw new Error('Invalid API response format');
          }
          return response.data;
        }).catch(error => {
          console.warn(`⚠️ Failed to fetch question ${i+1}:`, error.message);
          return null; // Return null for failed requests
        })
      );

      // Wait for all requests to complete
      const results = await Promise.all(promises);
      
      // Filter out any null results (failed requests)
      const questions = results.filter(q => q !== null);
      
      if (questions.length === 0) {
        throw new Error(`No questions fetched from topic "${topic}"`);
      }

      console.log(`✅ Fetched ${questions.length}/${count} questions from ${topic}`);
      return questions;

    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Topic "${topic}" not found in API`);
      }
      throw error;
    }
  }

  /**
   * Fetch random mix from multiple topics
   * @param {number} count 
   * @returns {Promise<Array>}
   */
  async fetchRandomMix(count) {
    const topics = ['Age', 'ProfitAndLoss', 'SpeedTimeDistance', 'MixtureAndAlligation', 'PipesAndCisterns', 'SimpleInterest'];
    const questionsPerTopic = Math.ceil(count / topics.length);
    
    const allQuestions = [];

    for (const topic of topics) {
      try {
        const questions = await this.fetchFromTopic(topic, questionsPerTopic);
        allQuestions.push(...questions);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from ${topic}, skipping...`);
      }
    }

    // Shuffle and take requested count
    return this.shuffleArray(allQuestions).slice(0, count);
  }

  /**
   * Fetch from all topics evenly distributed
   * @param {number} count 
   * @returns {Promise<Array>}
   */
  async fetchAllTopics(count) {
    const topics = ['Age', 'ProfitAndLoss', 'SpeedTimeDistance', 'MixtureAndAlligation', 'PipesAndCisterns', 'SimpleInterest'];
    const questionsPerTopic = Math.ceil(count / topics.length);
    
    const promises = topics.map(topic => 
      this.fetchFromTopic(topic, questionsPerTopic).catch(err => {
        console.warn(`⚠️ Failed to fetch from ${topic}:`, err.message);
        return [];
      })
    );

    const results = await Promise.all(promises);
    const allQuestions = results.flat();

    return allQuestions.slice(0, count);
  }

  /**
   * Format question to standard structure
   * @param {Object} rawQuestion - Raw question from API
   * @param {number} index - Question index
   * @returns {Object} - Formatted question
   */
  formatQuestion(rawQuestion, index) {
    console.log('🔍 Raw question from API:', JSON.stringify(rawQuestion, null, 2));
    
    // API returns: { question, options: [], answer, explanation, topic }
    // Use the options array directly from the API
    const options = rawQuestion.options || [];

    console.log('📋 Extracted options:', options);

    // Find correct answer index
    const correctAnswerIndex = options.findIndex(opt => opt === rawQuestion.answer);

    return {
      id: index + 1,
      question: rawQuestion.question,
      options: options,
      correctAnswer: correctAnswerIndex !== -1 ? correctAnswerIndex : 0,
      topic: rawQuestion.topic || 'Unknown',
      timeLimit: 30, // 30 seconds per question
      points: 10, // 10 points per correct answer
      // Store explanation for future premium feature (optional)
      explanation: rawQuestion.explanation || null
    };
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array 
   * @returns {Array}
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Validate if a topic is supported
   * @param {string} topic 
   * @returns {boolean}
   */
  isValidTopic(topic) {
    const validTopics = [
      'Random', 
      'All', 
      'Age', 
      'ProfitAndLoss', 
      'SpeedTimeDistance', 
      'MixtureAndAlligation', 
      'PipesAndCisterns',
      'SimpleInterest',
      'Calendars',
      'PermutationAndCombination'
    ];
    return validTopics.includes(topic);
  }

  /**
   * Get question difficulty estimate based on topic
   * @param {string} topic 
   * @returns {string} - 'Easy', 'Medium', 'Hard'
   */
  getDifficulty(topic) {
    const difficultyMap = {
      'Age': 'Easy',
      'SimpleInterest': 'Easy',
      'MixtureAndAlligation': 'Medium',
      'ProfitAndLoss': 'Medium',
      'SpeedTimeDistance': 'Medium',
      'Calendars': 'Medium',
      'PipesAndCisterns': 'Hard',
      'PermutationAndCombination': 'Hard',
      'Random': 'Mixed',
      'All': 'Mixed'
    };
    return difficultyMap[topic] || 'Medium';
  }
}

module.exports = new QuestionService();
