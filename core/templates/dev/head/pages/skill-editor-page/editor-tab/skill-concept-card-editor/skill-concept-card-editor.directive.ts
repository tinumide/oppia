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
 * @fileoverview Directive for the concept card editor.
 */

require(
  'components/state-directives/answer-group-editor/' +
  'summary-list-header.directive.ts');
require(
  'components/review-material-editor/review-material-editor.directive.ts');
require(
  'components/forms/schema-based-editors/schema-based-editor.directive.ts');
require('directives/angular-html-bind.directive.ts');
require(
  'pages/skill-editor-page/editor-tab/skill-concept-card-editor/' +
  'worked-example-editor.directive.ts');

require('domain/exploration/SubtitledHtmlObjectFactory.ts');
require('domain/skill/skill-update.service.ts');
require('domain/utilities/url-interpolation.service.ts');
require('filters/string-utility-filters/capitalize.filter.ts');
require('filters/format-rte-preview.filter.ts');
require('pages/skill-editor-page/services/skill-editor-state.service.ts');
require('services/GenerateContentIdService.ts');

require('pages/skill-editor-page/skill-editor-page.constants.ajs.ts');

angular.module('oppia').directive('skillConceptCardEditor', [
  'GenerateContentIdService', 'SkillEditorStateService', 'SkillUpdateService',
  'SubtitledHtmlObjectFactory', 'UrlInterpolationService',
  'COMPONENT_NAME_WORKED_EXAMPLE',
  function(
      GenerateContentIdService, SkillEditorStateService, SkillUpdateService,
      SubtitledHtmlObjectFactory, UrlInterpolationService,
      COMPONENT_NAME_WORKED_EXAMPLE) {
    return {
      restrict: 'E',
      scope: {},
      templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
        '/pages/skill-editor-page/editor-tab/skill-concept-card-editor/' +
        'skill-concept-card-editor.directive.html'),
      controller: [
        '$scope', '$filter', '$uibModal', 'EVENT_SKILL_REINITIALIZED',
        function($scope, $filter, $uibModal, EVENT_SKILL_REINITIALIZED) {
          $scope.skill = SkillEditorStateService.getSkill();
          $scope.dragDotsImgUrl = UrlInterpolationService.getStaticImageUrl(
            '/general/drag_dots.png');

          var initBindableFieldsDict = function() {
            $scope.bindableFieldsDict = {
              displayedConceptCardExplanation:
                $scope.skill.getConceptCard().getExplanation().getHtml(),
              displayedWorkedExamples:
                $scope.skill.getConceptCard().getWorkedExamples()
            };
          };

          var workedExamplesMemento = null;

          $scope.isEditable = function() {
            return true;
          };

          $scope.onSaveExplanation = function(explanationObject) {
            SkillUpdateService.setConceptCardExplanation(
              $scope.skill, explanationObject);
            initBindableFieldsDict();
          };

          initBindableFieldsDict();
          $scope.$on(EVENT_SKILL_REINITIALIZED, function() {
            initBindableFieldsDict();
          });

          // When the page is scrolled so that the top of the page is above the
          // browser viewport, there are some bugs in the positioning of the
          // helper. This is a bug in jQueryUI that has not been fixed yet.
          // For more details, see http://stackoverflow.com/q/5791886
          $scope.WORKED_EXAMPLES_SORTABLE_OPTIONS = {
            axis: 'y',
            cursor: 'move',
            handle: '.oppia-worked-example-sort-handle',
            items: '.oppia-sortable-worked-example',
            revert: 100,
            tolerance: 'pointer',
            start: function(e, ui) {
              $scope.activeWorkedExampleIndex = null;
              ui.placeholder.height(ui.item.height());
            },
            stop: function() {
              var newWorkedExamples =
                $scope.bindableFieldsDict.displayedWorkedExamples;
              SkillUpdateService.updateWorkedExamples(
                $scope.skill, newWorkedExamples);
            }
          };

          $scope.changeActiveWorkedExampleIndex = function(idx) {
            if (idx === $scope.activeWorkedExampleIndex) {
              $scope.activeWorkedExampleIndex = null;
            } else {
              $scope.activeWorkedExampleIndex = idx;
            }
          };

          $scope.deleteWorkedExample = function(index, evt) {
            $uibModal.open({
              templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
                '/pages/skill-editor-page/modal-templates/' +
                'delete-worked-example-modal.directive.html'),
              backdrop: 'static',
              controller: [
                '$scope', '$uibModalInstance',
                function($scope, $uibModalInstance) {
                  $scope.confirm = function() {
                    $uibModalInstance.close();
                  };

                  $scope.cancel = function() {
                    $uibModalInstance.dismiss('cancel');
                  };
                }]
            }).result.then(function(result) {
              SkillUpdateService.deleteWorkedExample($scope.skill, index);
              $scope.bindableFieldsDict.displayedWorkedExamples =
                $scope.skill.getConceptCard().getWorkedExamples();
              $scope.activeWorkedExampleIndex = null;
            });
          };

          $scope.getWorkedExampleSummary = function(workedExample) {
            return $filter('formatRtePreview')(workedExample);
          };

          $scope.openAddWorkedExampleModal = function() {
            $uibModal.open({
              templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
                '/pages/skill-editor-page/modal-templates/' +
                'add-worked-example-modal.directive.html'),
              backdrop: 'static',
              controller: [
                '$scope', '$uibModalInstance',
                function($scope, $uibModalInstance) {
                  $scope.WORKED_EXAMPLE_FORM_SCHEMA = {
                    type: 'html',
                    ui_config: {}
                  };

                  $scope.tmpWorkedExampleHtml = '';
                  $scope.saveWorkedExample = function() {
                    $uibModalInstance.close({
                      workedExampleHtml: $scope.tmpWorkedExampleHtml
                    });
                  };

                  $scope.cancel = function() {
                    $uibModalInstance.dismiss('cancel');
                  };
                }
              ]
            }).result.then(function(result) {
              SkillUpdateService.addWorkedExample(
                $scope.skill, SubtitledHtmlObjectFactory.createDefault(
                  result.workedExampleHtml,
                  GenerateContentIdService.getNextId(
                    $scope.skill.getConceptCard().getRecordedVoiceovers(
                    ).getAllContentId(),
                    COMPONENT_NAME_WORKED_EXAMPLE)));
              $scope.bindableFieldsDict.displayedWorkedExamples =
                $scope.skill.getConceptCard().getWorkedExamples();
            });
          };

          $scope.onWorkedExampleSaved = function() {
            $scope.bindableFieldsDict.displayedWorkedExamples =
              $scope.skill.getConceptCard().getWorkedExamples();
          };
        }
      ]
    };
  }
]);
