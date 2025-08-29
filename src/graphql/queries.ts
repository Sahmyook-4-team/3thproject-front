import { gql } from '@apollo/client';

// [수정] 부분 검색, 날짜 검색을 위한 새로운 쿼리
// 기존 GET_PATIENT_WITH_STUDIES 쿼리는 삭제하거나 주석 처리합니다.
export const SEARCH_PATIENTS = gql`
  query SearchPatients(
    $pid: String
    $pname: String
    $studyDateStart: String
    $studyDateEnd: String
    $modality: String
  ) {
    searchPatients(pid: $pid, pname: $pname) {
      pid
      pname
      # studies 필드를 조회할 때 날짜 범위 인자를 함께 전달합니다.
      studies(studyDateStart: $studyDateStart, studyDateEnd: $studyDateEnd,modality: $modality) {
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
