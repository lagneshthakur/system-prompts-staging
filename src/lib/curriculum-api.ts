/**
 * Curriculum Extraction Inspector API
 * Handles curriculum document inspection for QA/Debug purposes
 */

// Types
export interface InspectionOptions {
  showClassification: boolean;
  showYearFiltering: boolean;
  showExtraction: boolean;
}

export interface ClassificationResult {
  input: string;
  output: {
    document_type: 'multiple_year' | 'yearly' | 'full_term' | 'half_term' | 'lesson_week' | 'other';
    confidence: number;
  };
}

export interface YearFilteringResult {
  inputChunks: string[];
  filteredOutput: string;
}

export interface LearningObjective {
  title: string;
  week: number;
  subject?: string;
}

export interface ExtractionResult {
  prompt: string;
  output: {
    learning_objectives: LearningObjective[];
  };
}

export interface InspectionResponse {
  classification?: ClassificationResult;
  yearFiltering?: YearFilteringResult;
  extraction?: ExtractionResult;
}

export interface InspectionError {
  message: string;
  stage?: 'classification' | 'year_filtering' | 'extraction';
}

// Year groups available for selection
export const YEAR_GROUPS = [
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
] as const;

export type YearGroup = typeof YEAR_GROUPS[number];

// Accepted file types
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/msword': ['.doc'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.ms-powerpoint': ['.ppt'],
};

export const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';

// Dummy data generators
function generateDummyClassification(fileName: string): ClassificationResult {
  const sampleText = `Document: ${fileName}\n\nThis curriculum document outlines the learning objectives for the academic year. It includes topics covering Mathematics, English, Science, and other core subjects. The document is structured by terms and includes weekly breakdowns of learning goals.\n\nKey sections include:\n- Autumn Term objectives\n- Spring Term objectives\n- Summer Term objectives\n\nEach section details specific skills and knowledge areas...`;

  const documentTypes: ClassificationResult['output']['document_type'][] = [
    'half_term', 'yearly', 'full_term', 'lesson_week', 'multiple_year'
  ];
  const randomType = documentTypes[Math.floor(Math.random() * documentTypes.length)];

  return {
    input: sampleText.slice(0, 500),
    output: {
      document_type: randomType,
      confidence: 0.85 + Math.random() * 0.14, // 0.85 - 0.99
    },
  };
}

function generateDummyYearFiltering(yearGroup: string): YearFilteringResult {
  const year = yearGroup.replace('Year ', '');
  const otherYear = parseInt(year) === 3 ? '2' : '3';

  return {
    inputChunks: [
      `Chunk 1: "Autumn Term – Year ${otherYear}: Students will explore basic addition and subtraction, focusing on number bonds to 20. English lessons will introduce simple sentence structures and phonics patterns."`,
      `Chunk 2: "Spring Term – Year ${year}: Focus on multiplication tables (2, 5, 10) and division concepts. Students will write narrative stories with clear beginning, middle, and end structures."`,
      `Chunk 3: "Summer Term – Year ${year}: Geography unit on local area mapping. Science focus on plants and habitats. Mathematics continues with fractions and measurement."`,
      `Chunk 4: "Autumn Term – Year ${year}: Introduction to place value up to 1000. Reading comprehension strategies and inference skills development."`,
    ],
    filteredOutput: `Spring Term – Year ${year}: Focus on multiplication tables (2, 5, 10) and division concepts. Students will write narrative stories with clear beginning, middle, and end structures.

Summer Term – Year ${year}: Geography unit on local area mapping. Science focus on plants and habitats. Mathematics continues with fractions and measurement.

Autumn Term – Year ${year}: Introduction to place value up to 1000. Reading comprehension strategies and inference skills development.`,
  };
}

function generateDummyExtraction(yearGroup: string): ExtractionResult {
  return {
    prompt: `You are an expert curriculum analyzer. Extract all learning objectives from the following curriculum document for ${yearGroup}.

Return the results as a JSON object with the following structure:
{
  "learning_objectives": [
    {
      "title": "Brief description of the learning objective",
      "week": <week number>,
      "subject": "Subject area (Maths, English, Science, etc.)"
    }
  ]
}

Document content:
[Filtered curriculum content for ${yearGroup}]

Extract all learning objectives maintaining the original intent and specificity.`,
    output: {
      learning_objectives: [
        { title: "Understand place value up to 1000", week: 1, subject: "Maths" },
        { title: "Read and write numbers in numerals and words", week: 1, subject: "Maths" },
        { title: "Write narrative stories with clear structure", week: 2, subject: "English" },
        { title: "Use conjunctions to join sentences", week: 2, subject: "English" },
        { title: "Identify properties of 2D and 3D shapes", week: 3, subject: "Maths" },
        { title: "Measure length using standard units", week: 3, subject: "Maths" },
        { title: "Explore habitats and living things", week: 4, subject: "Science" },
        { title: "Classify animals by their characteristics", week: 4, subject: "Science" },
        { title: "Multiply and divide by 2, 5, and 10", week: 5, subject: "Maths" },
        { title: "Write instructions with imperative verbs", week: 5, subject: "English" },
        { title: "Understand food chains and ecosystems", week: 6, subject: "Science" },
        { title: "Use maps and compass directions", week: 6, subject: "Geography" },
      ],
    },
  };
}

/**
 * Run curriculum inspection (dummy implementation)
 * In production, this will call the actual backend API
 */
export async function runInspection(
  file: File,
  yearGroup: string,
  options: InspectionOptions
): Promise<{ data?: InspectionResponse; error?: InspectionError }> {
  // Simulate network delay (2-3 seconds)
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

  // Simulate occasional errors (10% chance)
  if (Math.random() < 0.1) {
    return {
      error: {
        message: 'Failed to process document. Please try again.',
        stage: 'classification',
      },
    };
  }

  const response: InspectionResponse = {};

  if (options.showClassification) {
    response.classification = generateDummyClassification(file.name);
  }

  if (options.showYearFiltering) {
    response.yearFiltering = generateDummyYearFiltering(yearGroup);
  }

  if (options.showExtraction) {
    response.extraction = generateDummyExtraction(yearGroup);
  }

  return { data: response };
}
