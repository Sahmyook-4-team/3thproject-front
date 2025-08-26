import { gql } from '@apollo/client';

// 환자 ID로 환자 정보와 모든 검사(Study) 목록을 가져오는 쿼리
export const GET_PATIENT_WITH_STUDIES = gql`
  query GetPatientWithStudies($pid: ID!) {
    patient(pid: $pid) {
      pid
      pname
      studies {
        studyKey
        studydesc
        studydate
        studytime
        modality
        seriescnt
        imagecnt
        report {
          reportId
          reportContent
          reportStatus
          author {
            username
          }
        }
      }
    }
  }
`;
