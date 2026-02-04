/**
 * Assignment Rubric Component
 * Display grading rubric for an assignment
 */

interface RubricCriterion {
  name: string;
  points: number;
  description?: string;
}

interface AssignmentRubricProps {
  rubric: {
    criteria: RubricCriterion[];
    total_points?: number;
  };
  maxPoints: number;
}

export default function AssignmentRubric({ rubric, maxPoints }: AssignmentRubricProps) {
  if (!rubric || !rubric.criteria || rubric.criteria.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
        <p>No grading rubric available for this assignment.</p>
      </div>
    );
  }

  const totalPoints = rubric.criteria.reduce((sum, criterion) => sum + criterion.points, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-blue-600 text-white px-6 py-4">
        <h3 className="text-lg font-semibold">Grading Rubric</h3>
        <p className="text-sm text-blue-100 mt-1">Total: {totalPoints} points</p>
      </div>

      <div className="divide-y divide-gray-200">
        {rubric.criteria.map((criterion, index) => (
          <div key={index} className="p-5 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h4 className="font-semibold text-gray-900">{criterion.name}</h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-2xl font-bold text-blue-600">{criterion.points}</span>
                <span className="text-sm text-gray-600">pts</span>
              </div>
            </div>

            {criterion.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{criterion.description}</p>
            )}

            {/* Visual Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${maxPoints > 0 ? (criterion.points / maxPoints) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {maxPoints > 0 ? ((criterion.points / maxPoints) * 100).toFixed(1) : '0.0'}% of total grade
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Total Points</span>
          <span className="text-2xl font-bold text-gray-900">{totalPoints}</span>
        </div>
      </div>
    </div>
  );
}
