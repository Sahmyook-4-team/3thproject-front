// src/graphql/mutations.ts

import { gql } from '@apollo/client';

export const CREATE_OR_UPDATE_REPORT = gql`
  mutation CreateOrUpdateReport(
    $studyKey: Long!
    $reportContent: String!
    $reportStatus: ReportStatus = DRAFT
  ) {
    createOrUpdateReport(
      input: {
        studyKey: $studyKey
        reportContent: $reportContent
        reportStatus: $reportStatus
      }
    ) {
      reportId
      studyKey
      reportContent
      reportStatus
      author {
        username
      }
    }
  }
`;