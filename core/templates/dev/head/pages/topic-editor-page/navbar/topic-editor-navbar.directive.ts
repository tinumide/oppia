// Copyright 2018 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Directive for the navbar of the topic editor.
 */

require(
  'components/common-layout-directives/common-elements/' +
  'loading-dots.directive.ts');

require('domain/editor/undo_redo/undo-redo.service.ts');
require('domain/topic/topic-rights-backend-api.service.ts');
require('pages/topic-editor-page/services/topic-editor-routing.service.ts');
require('pages/topic-editor-page/services/topic-editor-state.service.ts');
require('services/AlertsService.ts');
require('services/contextual/UrlService.ts');

angular.module('oppia').directive('topicEditorNavbar', [
  'UrlInterpolationService', function(UrlInterpolationService) {
    return {
      restrict: 'E',
      templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
        '/pages/topic-editor-page/navbar/topic-editor-navbar.directive.html'),
      controller: [
        '$scope', '$rootScope', '$uibModal', '$window', 'AlertsService',
        'UndoRedoService', 'TopicEditorStateService', 'UrlService',
        'TopicRightsBackendApiService', 'TopicEditorRoutingService',
        'EVENT_TOPIC_INITIALIZED', 'EVENT_TOPIC_REINITIALIZED',
        'EVENT_UNDO_REDO_SERVICE_CHANGE_APPLIED',
        function(
            $scope, $rootScope, $uibModal, $window, AlertsService,
            UndoRedoService, TopicEditorStateService, UrlService,
            TopicRightsBackendApiService, TopicEditorRoutingService,
            EVENT_TOPIC_INITIALIZED, EVENT_TOPIC_REINITIALIZED,
            EVENT_UNDO_REDO_SERVICE_CHANGE_APPLIED) {
          $scope.topicId = UrlService.getTopicIdFromUrl();
          $scope.topic = TopicEditorStateService.getTopic();
          $scope.topicSkillIds = $scope.topic.getSkillIds();
          $scope.validationIssues = [];
          $scope.topicRights = TopicEditorStateService.getTopicRights();
          $scope.isSaveInProgress = TopicEditorStateService.isSavingTopic;
          $scope.getActiveTabName = TopicEditorRoutingService.getActiveTabName;
          $scope.selectMainTab = TopicEditorRoutingService.navigateToMainTab;
          $scope.selectSubtopicsTab =
            TopicEditorRoutingService.navigateToSubtopicsTab;
          $scope.selectQuestionsTab =
            TopicEditorRoutingService.navigateToQuestionsTab;

          var _validateTopic = function() {
            $scope.validationIssues = $scope.topic.validate();
          };

          $scope.publishTopic = function() {
            if (!$scope.topicRights.canPublishTopic()) {
              var modalInstance = $uibModal.open({
                templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
                  '/pages/topic-editor-page/modal-templates/' +
                  'topic-editor-send-mail-modal.template.html'),
                backdrop: true,
                controller: [
                  '$scope', '$uibModalInstance',
                  function($scope, $uibModalInstance) {
                    $scope.sendMail = function() {
                      $uibModalInstance.close();
                    };
                    $scope.cancel = function() {
                      $uibModalInstance.dismiss('cancel');
                    };
                  }
                ]
              });

              modalInstance.result.then(function() {
                TopicRightsBackendApiService.sendMail(
                  $scope.topicId, $scope.topicName).then(function() {
                  var successToast = 'Mail Sent.';
                  AlertsService.addSuccessMessage(
                    successToast, 1000);
                });
              });
              return;
            }
            var redirectToDashboard = false;
            TopicRightsBackendApiService.publishTopic($scope.topicId).then(
              function() {
                if (!$scope.topicRights.isPublished()) {
                  redirectToDashboard = true;
                }
                $scope.topicRights.markTopicAsPublished();
                TopicEditorStateService.setTopicRights($scope.topicRights);
              }
            ).then(function() {
              var successToast = 'Topic published.';
              if (redirectToDashboard) {
                $window.location = '/topics_and_skills_dashboard';
              }
              AlertsService.addSuccessMessage(
                successToast, 1000);
            });
          };

          $scope.discardChanges = function() {
            UndoRedoService.clearChanges();
            TopicEditorStateService.loadTopic($scope.topicId);
          };

          $scope.getChangeListLength = function() {
            return UndoRedoService.getChangeCount();
          };

          $scope.isTopicSaveable = function() {
            return (
              $scope.getChangeListLength() > 0 &&
              $scope.getWarningsCount() === 0);
          };

          $scope.getWarningsCount = function() {
            return $scope.validationIssues.length;
          };

          $scope.saveChanges = function() {
            var topicIsPublished = $scope.topicRights.isPublished();
            var modalInstance = $uibModal.open({
              templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
                '/pages/topic-editor-page/modal-templates/' +
                'topic-editor-save-modal.template.html'),
              backdrop: true,
              controller: [
                '$scope', '$uibModalInstance',
                function($scope, $uibModalInstance) {
                  $scope.isTopicPublished = topicIsPublished;

                  $scope.save = function(commitMessage) {
                    $uibModalInstance.close(commitMessage);
                  };
                  $scope.cancel = function() {
                    $uibModalInstance.dismiss('cancel');
                  };
                }
              ]
            });

            modalInstance.result.then(function(commitMessage) {
              TopicEditorStateService.saveTopic(commitMessage);
            }).then(function() {
              var successToast = 'Changes saved.';
              AlertsService.addSuccessMessage(
                successToast, 1000);
            });
          };

          $scope.unpublishTopic = function() {
            if (!$scope.topicRights.canPublishTopic()) {
              return false;
            }
            TopicRightsBackendApiService.unpublishTopic($scope.topicId).then(
              function() {
                $scope.topicRights.markTopicAsUnpublished();
                TopicEditorStateService.setTopicRights($scope.topicRights);
              });
          };

          $scope.$on(EVENT_TOPIC_INITIALIZED, _validateTopic);
          $scope.$on(EVENT_TOPIC_REINITIALIZED, _validateTopic);
          $scope.$on(
            EVENT_UNDO_REDO_SERVICE_CHANGE_APPLIED, _validateTopic);
        }
      ]
    };
  }]);
